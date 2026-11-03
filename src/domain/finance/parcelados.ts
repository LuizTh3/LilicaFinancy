import { competencia, dataCalendario, dataNaCompetencia } from './calendar'
import type { Competencia } from './calendar'
import { idCartaoValido } from './cartoes'
import type { CalculoParcelado, DadosSerieParcelada, ParcelaExterna, PreviaCriacaoParcelada, SerieParcelada } from './contracts/parcelados'
import { camposPermitidos, falha, registro, sucesso, umDe, versaoValida } from './errors'
import type { Resultado } from './errors'
import { montarCronograma } from './installments'
import { centavos, multiplicarCentavos, somarCentavos, valorPositivo } from './money'
import { eventoParceladoValido, instanteParceladoValido, normalizarReferenciasParceladas, posicaoParcelada } from './parceladosValidation'

const invalida = () => falha('valorInvalido', 'Confira a série e o cronograma informado.', { recuperacao: 'corrigir' })
const texto = (v: unknown, max: number): v is string => typeof v === 'string' && !!v.trim() && [...v.trim()].length <= max
const camposBase = ['tipo', 'origemDados', 'quantidadeOriginal', 'numeroInicial', 'descricao', 'modo', 'diaAncora', 'valorOriginalCentavos', 'dataContratacao', 'dataConsumo']
const camposParcela = ['numero', 'quantidadeOriginal', 'descricao', 'categoriaId', 'valorCentavos', 'competenciaPlanejamento', 'vencimento', 'estadoObrigacao', 'liquidadoLiquidoCentavos', 'jaLiquidada', 'ultimoEventoParcelaId', 'titularId', 'contaPrevistaId', 'etiquetaIds', 'observacao', 'canceledAt', 'cancelamentoMotivo']
function validarBase(v: Record<string, unknown>): boolean {
  return umDe(v.tipo, ['compromissoExterno', 'emprestimo']) && umDe(v.origemDados, ['nova', 'migrada']) && typeof v.quantidadeOriginal === 'number' && Number.isInteger(v.quantidadeOriginal) && v.quantidadeOriginal >= 1 && v.quantidadeOriginal <= 12 && typeof v.numeroInicial === 'number' && Number.isInteger(v.numeroInicial) && v.numeroInicial >= 1 && v.numeroInicial <= v.quantidadeOriginal && (v.origemDados !== 'nova' || v.numeroInicial === 1) && texto(v.descricao, 120) && umDe(v.modo, ['mensal', 'explicito']) && (v.modo === 'mensal' ? typeof v.diaAncora === 'number' && Number.isInteger(v.diaAncora) && v.diaAncora >= 1 && v.diaAncora <= 31 : !('diaAncora' in v)) && (!('valorOriginalCentavos' in v) || valorPositivo(v.valorOriginalCentavos).ok) && ['dataContratacao', 'dataConsumo'].every(k => !(k in v) || dataCalendario(v[k]).ok)
}
export function prepararCriacao(input: unknown, eventoId: string): Resultado<PreviaCriacaoParcelada> {
  if (!registro(input) || !camposPermitidos(input, [...camposBase, 'referencias', 'calculo', 'primeiroVencimento', 'primeiraCompetencia', 'cronograma', 'observacao']) || !validarBase(input) || !/^criarSerie__[A-Za-z0-9-]{1,64}$/.test(eventoId) || !registro(input.calculo) || 'observacao' in input && !texto(input.observacao, 1000)) return invalida()
  const refs = normalizarReferenciasParceladas(input.referencias)
  if (!refs.ok) return refs
  const n = input.quantidadeOriginal as number, p = input.numeroInicial as number, count = n - p + 1
  const parcelas: Record<string, ParcelaExterna> = {}
  const rows: { numero: number; valorCentavos: unknown; competenciaPlanejamento: unknown; vencimento: unknown }[] = []
  let calculo: CalculoParcelado
  if (input.modo === 'mensal') {
    if ('cronograma' in input || !camposPermitidos(input.calculo, input.calculo.tipo === 'total' ? ['tipo', 'totalCentavos'] : ['tipo', 'valorCentavos'])) return invalida()
    const first = dataCalendario(input.primeiroVencimento), mes = competencia(input.primeiraCompetencia)
    if (!first.ok) return first
    if (!mes.ok) return mes
    const ancora = dataNaCompetencia(first.valor.slice(0, 7), input.diaAncora)
    if (!ancora.ok || ancora.valor !== first.valor) return invalida()
    const total = input.calculo.tipo === 'porParcela' ? multiplicarCentavos(input.calculo.valorCentavos, count) : input.calculo.tipo === 'total' ? valorPositivo(input.calculo.totalCentavos) : invalida()
    if (!total.ok) return total
    const positivo = valorPositivo(total.valor)
    if (!positivo.ok) return positivo
    const known = input.calculo.tipo === 'porParcela' ? { valoresConhecidos: Array(count).fill(input.calculo.valorCentavos) } : {}
    const schedule = montarCronograma({ origemDados: input.origemDados, quantidadeOriginal: n, numeroInicial: p, totalCentavos: positivo.valor, saldoMigradoCentavos: positivo.valor, primeiraCompetencia: mes.valor, primeiroVencimento: first.valor, diaAncora: input.diaAncora, ...known })
    if (!schedule.ok) return schedule
    rows.push(...schedule.valor)
    if (input.calculo.tipo === 'porParcela') {
      const valor = valorPositivo(input.calculo.valorCentavos)
      if (!valor.ok) return valor
      calculo = { tipo: 'porParcela', totalCentavos: positivo.valor, valorCentavos: valor.valor }
    } else calculo = { tipo: 'total', totalCentavos: positivo.valor, q: Number(BigInt(positivo.valor) / BigInt(count)), resto: Number(BigInt(positivo.valor) % BigInt(count)) }
  } else {
    if ('primeiroVencimento' in input || 'primeiraCompetencia' in input || input.calculo.tipo !== 'explicito' || !camposPermitidos(input.calculo, ['tipo']) || !Array.isArray(input.cronograma) || input.cronograma.length !== count) return invalida()
    for (let i = 0; i < count; i++) {
      const row = input.cronograma[i]
      if (!registro(row) || !camposPermitidos(row, ['numero', 'valorCentavos', 'competenciaPlanejamento', 'vencimento']) || row.numero !== p + i) return invalida()
      rows.push({ numero: row.numero as number, valorCentavos: row.valorCentavos, competenciaPlanejamento: row.competenciaPlanejamento, vencimento: row.vencimento })
    }
    const total = somarCentavos(rows.map(r => r.valorCentavos))
    if (!total.ok) return total
    const positivo = valorPositivo(total.valor)
    if (!positivo.ok) return positivo
    calculo = { tipo: 'explicito', totalCentavos: positivo.valor }
  }
  let anterior = ''
  for (const row of rows) {
    const valor = valorPositivo(row.valorCentavos), mes = competencia(row.competenciaPlanejamento), vencimento = dataCalendario(row.vencimento)
    if (!valor.ok) return valor
    if (!mes.ok) return mes
    if (!vencimento.ok) return vencimento
    if (vencimento.valor < anterior) return invalida()
    anterior = vencimento.valor
    parcelas[posicaoParcelada(row.numero)] = Object.freeze({ ...refs.valor, numero: row.numero, quantidadeOriginal: n, descricao: (input.descricao as string).trim(), valorCentavos: valor.valor, competenciaPlanejamento: mes.valor, vencimento: vencimento.valor, estadoObrigacao: 'ativa', liquidadoLiquidoCentavos: 0 as ParcelaExterna['liquidadoLiquidoCentavos'], jaLiquidada: false, ultimoEventoParcelaId: eventoId, ...(typeof input.observacao === 'string' ? { observacao: input.observacao.trim() } : {}) })
  }
  const dados = { ...Object.fromEntries(camposBase.filter(k => k in input).map(k => [k, input[k]])), descricao: (input.descricao as string).trim(), parcelas: Object.freeze(parcelas), competencias: Object.freeze([...new Set(Object.values(parcelas).map(row => row.competenciaPlanejamento))].sort()) } as DadosSerieParcelada
  const resultado = { dados: Object.freeze(dados), referencias: refs.valor, calculo: Object.freeze(calculo), totalCadastradoCentavos: calculo.totalCentavos }
  return new TextEncoder().encode(JSON.stringify(resultado)).length <= 16384 ? sucesso(Object.freeze(resultado)) : falha('limiteOperacional', 'O comando excede 16 KiB.', { limite: 16384 })
}

export function validarSerieParcelada(input: unknown): Resultado<SerieParcelada> {
  if (!registro(input) || !camposPermitidos(input, [...camposBase, 'uid', 'id', 'schemaVersion', 'version', 'parcelas', 'competencias', 'ultimoEventoId', 'createdAt', 'updatedAt', 'receitaVinculadaId', 'substituiSerieId', 'substituicaoEventoId']) || !validarBase(input) || !idCartaoValido(input.id) || typeof input.uid !== 'string' || !input.uid || input.schemaVersion !== 1 || !versaoValida(input.version) || !eventoParceladoValido(input.ultimoEventoId) || !instanteParceladoValido(input.createdAt) || !instanteParceladoValido(input.updatedAt) || input.updatedAt < input.createdAt || !registro(input.parcelas) || !Array.isArray(input.competencias)) return falha('esquemaIncompativel', 'Série parcelada incompatível.')
  if ('receitaVinculadaId' in input && (input.tipo !== 'emprestimo' || !idCartaoValido(input.receitaVinculadaId)) || ('substituiSerieId' in input) !== ('substituicaoEventoId' in input) || 'substituiSerieId' in input && (!idCartaoValido(input.substituiSerieId) || input.substituiSerieId === input.id || typeof input.substituicaoEventoId !== 'string' || !/^substituirSerie__[A-Za-z0-9-]{1,64}$/.test(input.substituicaoEventoId))) return invalida()
  const n = input.quantidadeOriginal as number, p = input.numeroInicial as number
  if (input.version === 1 && (input.createdAt !== input.updatedAt || 'receitaVinculadaId' in input || !/^(criarSerie|substituirSerie)__/.test(input.ultimoEventoId))) return invalida()
  if (Object.keys(input.parcelas).length !== n - p + 1 || input.descricao !== (input.descricao as string).trim()) return invalida()
  const parcelas: Record<string, ParcelaExterna> = {}, meses = new Set<Competencia>()
  let anterior = ''
  for (let numero = p; numero <= n; numero++) {
    const row = input.parcelas[posicaoParcelada(numero)]
    if (!registro(row) || !camposPermitidos(row, camposParcela) || row.numero !== numero || row.quantidadeOriginal !== n || !texto(row.descricao, 120) || row.descricao !== row.descricao.trim() || !eventoParceladoValido(row.ultimoEventoParcelaId) || !umDe(row.estadoObrigacao, ['ativa', 'cancelada']) || typeof row.jaLiquidada !== 'boolean') return invalida()
    if (input.version === 1 && (row.jaLiquidada || row.liquidadoLiquidoCentavos !== 0 || row.estadoObrigacao !== 'ativa' || row.ultimoEventoParcelaId !== input.ultimoEventoId)) return invalida()
    const refs = normalizarReferenciasParceladas(Object.fromEntries(['categoriaId', 'titularId', 'contaPrevistaId', 'etiquetaIds'].filter(k => k in row).map(k => [k, row[k]])))
    const valor = valorPositivo(row.valorCentavos), liquidado = centavos(row.liquidadoLiquidoCentavos), mes = competencia(row.competenciaPlanejamento), due = dataCalendario(row.vencimento)
    if (!refs.ok || !valor.ok || !liquidado.ok || liquidado.valor > valor.valor || !row.jaLiquidada && liquidado.valor !== 0 || !mes.ok || !due.ok || due.valor < anterior || 'observacao' in row && (!texto(row.observacao, 1000) || row.observacao !== row.observacao.trim())) return invalida()
    if (Array.isArray(row.etiquetaIds) && JSON.stringify(row.etiquetaIds) !== JSON.stringify(refs.valor.etiquetaIds)) return invalida()
    if (row.estadoObrigacao === 'cancelada' ? liquidado.valor !== 0 || !instanteParceladoValido(row.canceledAt) || row.canceledAt > input.updatedAt || !texto(row.cancelamentoMotivo, 1000) || row.cancelamentoMotivo !== row.cancelamentoMotivo.trim() : 'canceledAt' in row || 'cancelamentoMotivo' in row) return invalida()
    anterior = due.valor
    meses.add(mes.valor)
    parcelas[posicaoParcelada(numero)] = Object.freeze({ ...row, ...refs.valor } as ParcelaExterna)
  }
  const indices = [...meses].sort()
  if (JSON.stringify(indices) !== JSON.stringify(input.competencias) || !somarCentavos(Object.values(parcelas).map(p => p.valorCentavos)).ok || new TextEncoder().encode(JSON.stringify(input)).length > 32768) return invalida()
  return sucesso(Object.freeze({ ...input, parcelas: Object.freeze(parcelas), competencias: Object.freeze(indices) } as SerieParcelada))
}

export function criarSerieParcelada(input: unknown, meta: Readonly<{ uid: string; id: string; operationKey: string; instante: number }>): Resultado<SerieParcelada> {
  if (!meta.uid || !idCartaoValido(meta.id) || !idCartaoValido(meta.operationKey) || !instanteParceladoValido(meta.instante)) return invalida()
  const eventoId = `criarSerie__${meta.operationKey}`, plano = prepararCriacao(input, eventoId)
  return plano.ok ? validarSerieParcelada({ ...plano.valor.dados, uid: meta.uid, id: meta.id, schemaVersion: 1, version: 1, ultimoEventoId: eventoId, createdAt: meta.instante, updatedAt: meta.instante }) : plano
}
