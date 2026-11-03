import { avancarMes, dataCalendario } from './calendar'
import { idCartaoValido } from './cartoes'
import type { ParcelaExterna, SerieParcelada } from './contracts/parcelados'
import { camposPermitidos, falha, registro, sucesso } from './errors'
import type { Resultado } from './errors'
import { criarSerieParcelada, validarSerieParcelada } from './parcelados'
import { instanteParceladoValido, posicaoParcelada } from './parceladosValidation'

type Meta = Readonly<{ uid: string; instante: number; operationKey: string }>
type Proposta = Readonly<{ antes: SerieParcelada; depois: SerieParcelada; semAlteracao: boolean; elegiveis: readonly number[]; preservadas: readonly Readonly<{ numero: number; motivo: 'historicoLiquidacao' | 'cancelada' }>[] }>
const invalid = () => falha('valorInvalido', 'Confira os alvos, o alcance e a prévia da alteração.', { recuperacao: 'corrigir' })
const imagem = (v: unknown) => JSON.stringify(v, (_k, value: unknown) => registro(value) ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : value)
function base(input: unknown, comando: unknown, meta: Meta): Resultado<SerieParcelada> {
  const serie = validarSerieParcelada(input)
  if (!serie.ok) return serie
  if (!meta.uid || meta.uid !== serie.valor.uid || !idCartaoValido(meta.operationKey) || !instanteParceladoValido(meta.instante) || meta.instante < serie.valor.updatedAt || !registro(comando)) return invalid()
  if (comando.expectedVersion !== serie.valor.version) return falha('conflitoVersao', 'A série mudou. Releia antes de conferir.', { recuperacao: 'reler' })
  if (serie.valor.version === Number.MAX_SAFE_INTEGER) return falha('limiteOperacional', 'A revisão da série atingiu o limite suportado.')
  return serie
}
function atualizar(s: SerieParcelada, parcelas: Readonly<Record<string, ParcelaExterna>>, eventoId: string, instante: number): Resultado<SerieParcelada> {
  return validarSerieParcelada({ ...s, parcelas, competencias: [...new Set(Object.values(parcelas).map(p => p.competenciaPlanejamento))].sort(), version: s.version + 1, ultimoEventoId: eventoId, updatedAt: instante })
}
export function prepararEdicaoParcelada(input: unknown, comando: unknown, meta: Meta): Resultado<Proposta> {
  const s = base(input, comando, meta)
  if (!s.ok) return s
  if (!registro(comando) || !camposPermitidos(comando, ['expectedVersion', 'selecionada', 'alcance', 'alteracoes', 'referencias', 'vencimentos', 'competencias']) || typeof comando.selecionada !== 'number' || !Number.isInteger(comando.selecionada) || comando.selecionada < s.valor.numeroInicial || comando.selecionada > s.valor.quantidadeOriginal || !['esta', 'estaEFuturasNaoPagas'].includes(String(comando.alcance)) || !registro(comando.alteracoes) || !camposPermitidos(comando.alteracoes, ['descricao', 'valorCentavos', 'vencimento', 'observacao'])) return invalid()
  if ('referencias' in comando && (!registro(comando.referencias) || !camposPermitidos(comando.referencias, ['categoriaId', 'titularId', 'contaPrevistaId', 'etiquetaIds']))) return invalid()
  for (const nome of ['vencimentos', 'competencias']) if (nome in comando && !registro(comando[nome])) return invalid()
  const alteracoes = comando.alteracoes, referencias = registro(comando.referencias) ? comando.referencias : {}
  if ('vencimento' in alteracoes && (s.valor.modo !== 'mensal' || 'vencimentos' in comando || !dataCalendario(alteracoes.vencimento).ok)) return invalid()
  if ('descricao' in alteracoes && (typeof alteracoes.descricao !== 'string' || !alteracoes.descricao.trim())) return invalid()
  if ('observacao' in alteracoes && alteracoes.observacao !== null && typeof alteracoes.observacao !== 'string') return invalid()
  const parcelas = { ...s.valor.parcelas }, elegiveis: number[] = [], preservadas: { numero: number; motivo: 'historicoLiquidacao' | 'cancelada' }[] = []
  const eventoId = `editarParcelas__${meta.operationKey}`
  let mudou = false
  for (const [key, row] of Object.entries(s.valor.parcelas)) {
    if (row.numero < comando.selecionada || comando.alcance === 'esta' && row.numero !== comando.selecionada) continue
    if (row.estadoObrigacao === 'cancelada' || row.jaLiquidada) {
      if (comando.alcance === 'esta') return invalid()
      preservadas.push({ numero: row.numero, motivo: row.estadoObrigacao === 'cancelada' ? 'cancelada' : 'historicoLiquidacao' }); continue
    }
    elegiveis.push(row.numero)
    const next: Record<string, unknown> = { ...row }
    for (const campo of ['descricao', 'valorCentavos', 'observacao']) if (campo in alteracoes) {
      const v = alteracoes[campo]
      if (campo === 'observacao' && (v === null || v === '')) delete next.observacao
      else next[campo] = typeof v === 'string' ? v.trim() : v
    }
    for (const [campo, value] of Object.entries(referencias)) {
      if (value === null && ['titularId', 'contaPrevistaId'].includes(campo)) delete next[campo]
      else next[campo] = campo === 'etiquetaIds' && Array.isArray(value) ? [...value].sort() : value
    }
    if ('vencimento' in alteracoes) {
      const date = avancarMes(alteracoes.vencimento, comando.alcance === 'esta' ? 0 : row.numero - comando.selecionada, Number((alteracoes.vencimento as string).slice(8, 10)))
      if (!date.ok) return date
      next.vencimento = date.valor
    }
    if (registro(comando.vencimentos) && key in comando.vencimentos) next.vencimento = comando.vencimentos[key]
    else if (s.valor.modo === 'explicito' && 'vencimentos' in comando) return invalid()
    if (registro(comando.competencias) && key in comando.competencias) next.competenciaPlanejamento = comando.competencias[key]
    if (imagem(next) !== imagem(row)) { parcelas[key] = { ...next, ultimoEventoParcelaId: eventoId } as ParcelaExterna; mudou = true }
  }
  for (const mapa of [comando.vencimentos, comando.competencias]) if (registro(mapa) && Object.keys(mapa).some(key => !elegiveis.some(numero => posicaoParcelada(numero) === key))) return invalid()
  if (!mudou) return sucesso({ antes: s.valor, depois: s.valor, semAlteracao: true, elegiveis, preservadas })
  const depois = atualizar(s.valor, parcelas, eventoId, meta.instante)
  return depois.ok ? sucesso({ antes: s.valor, depois: depois.valor, semAlteracao: false, elegiveis, preservadas }) : depois
}
export function prepararCancelamentoParcelado(input: unknown, comando: unknown, meta: Meta): Resultado<Proposta> {
  const s = base(input, comando, meta)
  if (!s.ok) return s
  if (!registro(comando) || !camposPermitidos(comando, ['expectedVersion', 'numeros', 'motivo']) || !Array.isArray(comando.numeros) || !comando.numeros.length || comando.numeros.length > 12 || new Set(comando.numeros).size !== comando.numeros.length || typeof comando.motivo !== 'string' || !comando.motivo.trim() || [...comando.motivo.trim()].length > 1000) return invalid()
  const parcelas = { ...s.valor.parcelas }, eventoId = `cancelarParcelas__${meta.operationKey}`, elegiveis: number[] = []
  for (const numero of comando.numeros) {
    if (typeof numero !== 'number' || !Number.isInteger(numero)) return invalid()
    const chave = posicaoParcelada(numero), row = parcelas[chave]
    if (!row || row.liquidadoLiquidoCentavos !== 0) return invalid()
    if (row.estadoObrigacao === 'cancelada') continue
    parcelas[chave] = { ...row, estadoObrigacao: 'cancelada', canceledAt: meta.instante, cancelamentoMotivo: comando.motivo.trim(), ultimoEventoParcelaId: eventoId }
    elegiveis.push(numero)
  }
  if (!elegiveis.length) return sucesso({ antes: s.valor, depois: s.valor, semAlteracao: true, elegiveis, preservadas: [] })
  const depois = atualizar(s.valor, parcelas, eventoId, meta.instante)
  return depois.ok ? sucesso({ antes: s.valor, depois: depois.valor, semAlteracao: false, elegiveis, preservadas: [] }) : depois
}
export function prepararSubstituicaoParcelada(input: unknown, comando: unknown, meta: Meta): Resultado<{ antiga: SerieParcelada; nova: SerieParcelada }> {
  if (!registro(comando) || !camposPermitidos(comando, ['expectedVersion', 'numeros', 'motivo', 'novaSerieId', 'novaEntrada']) || !idCartaoValido(comando.novaSerieId)) return invalid()
  const antes = base(input, comando, meta)
  if (!antes.ok) return antes
  if (comando.novaSerieId === antes.valor.id) return invalid()
  const cancelamento = prepararCancelamentoParcelado(input, { expectedVersion: comando.expectedVersion, numeros: comando.numeros, motivo: comando.motivo }, meta)
  if (!cancelamento.ok) return cancelamento
  if (cancelamento.valor.semAlteracao) return invalid()
  const criacao = criarSerieParcelada(comando.novaEntrada, { uid: meta.uid, id: comando.novaSerieId, operationKey: meta.operationKey, instante: meta.instante })
  if (!criacao.ok) return criacao
  const eventoId = `substituirSerie__${meta.operationKey}`, antigaBase = cancelamento.valor.depois
  const antiga = validarSerieParcelada({ ...antigaBase, ultimoEventoId: eventoId, parcelas: Object.fromEntries(Object.entries(antigaBase.parcelas).map(([key, row]) => [key, cancelamento.valor.elegiveis.includes(row.numero) ? { ...row, ultimoEventoParcelaId: eventoId } : row])) })
  const nova = validarSerieParcelada({ ...criacao.valor, ultimoEventoId: eventoId, substituiSerieId: antes.valor.id, substituicaoEventoId: eventoId, parcelas: Object.fromEntries(Object.entries(criacao.valor.parcelas).map(([key, row]) => [key, { ...row, ultimoEventoParcelaId: eventoId }])) })
  return !antiga.ok ? antiga : !nova.ok ? nova : sucesso({ antiga: antiga.valor, nova: nova.valor })
}
export function prepararVinculoReceita(input: unknown, comando: unknown, meta: Meta): Resultado<{ serie: SerieParcelada; vinculo: Readonly<{ serieId: string; receitaId: string; operacaoId: string; createdAt: number }> }> {
  const s = base(input, comando, meta)
  if (!s.ok) return s
  if (!registro(comando) || !camposPermitidos(comando, ['expectedVersion', 'receita', 'vinculoAusente']) || !registro(comando.receita) || comando.receita.uid !== meta.uid || comando.receita.natureza !== 'receita' || !idCartaoValido(comando.receita.id) || comando.vinculoAusente !== true || s.valor.tipo !== 'emprestimo' || s.valor.receitaVinculadaId !== undefined) return invalid()
  const eventoId = `vincularReceita__${meta.operationKey}`
  const depois = validarSerieParcelada({ ...s.valor, version: s.valor.version + 1, updatedAt: meta.instante, ultimoEventoId: eventoId, receitaVinculadaId: comando.receita.id })
  return depois.ok ? sucesso({ serie: depois.valor, vinculo: { serieId: s.valor.id, receitaId: comando.receita.id, operacaoId: eventoId, createdAt: meta.instante } }) : depois
}
