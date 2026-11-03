import { idCartaoValido } from './cartoes'
import type { ComandoCriacaoParcelada, CriacaoParcelada, DescritorParcelado } from './contracts/parcelados'
import { camposPermitidos, falha, registro, sucesso } from './errors'
import type { Resultado } from './errors'
import { prepararCriacao } from './parcelados'
import { eventoParceladoValido, posicaoParcelada, tiposParcelados } from './parceladosValidation'

export function descritorParceladoValido(v: unknown): v is DescritorParcelado {
  return registro(v) && camposPermitidos(v, ['contractVersion', 'tipo', 'operationKey', 'serieId', 'expectedVersion']) && v.contractVersion === 1 && tiposParcelados.includes(v.tipo as DescritorParcelado['tipo']) && idCartaoValido(v.operationKey) && idCartaoValido(v.serieId) && typeof v.expectedVersion === 'number' && Number.isSafeInteger(v.expectedVersion) && v.expectedVersion >= 0 && v.expectedVersion < Number.MAX_SAFE_INTEGER && (v.tipo === 'criarSerie' ? v.expectedVersion === 0 : v.expectedVersion > 0)
}
export function canonicoParcelado(v: unknown): string {
  function ordenar(value: unknown, depth: number): unknown {
    if (depth > 20) throw Error('CANONICAL_DEPTH')
    if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isSafeInteger(value)) return value
    if (Array.isArray(value)) return value.map(item => ordenar(item, depth + 1))
    if (!registro(value)) throw Error('CANONICAL_VALUE')
    return Object.fromEntries(Object.keys(value).sort().map(k => [k, ordenar(value[k], depth + 1)]))
  }
  const json = JSON.stringify(ordenar(v, 0))
  if (new TextEncoder().encode(json).length > 16384) throw Error('CANONICAL_SIZE')
  return json
}
export function normalizarCriacaoParcelada(input: unknown): Resultado<{ descritor: DescritorParcelado; comando: ComandoCriacaoParcelada; conferencia: string }> {
  if (!registro(input) || !camposPermitidos(input, ['descritor', 'entrada']) || !descritorParceladoValido(input.descritor) || input.descritor.tipo !== 'criarSerie') return falha('valorInvalido', 'Confira a intenção de criação da série.')
  const d = input.descritor, plano = prepararCriacao(input.entrada, `criarSerie__${d.operationKey}`)
  if (!plano.ok) return plano
  const { dados, referencias, calculo } = plano.valor
  const comando = Object.freeze({ serieId: d.serieId, criacao: Object.freeze({ dados, referencias, calculo }) })
  try { return sucesso({ descritor: Object.freeze({ ...d }), comando, conferencia: canonicoParcelado({ descritor: d, comando }) }) }
  catch { return falha('limiteOperacional', 'O comando excede os limites de conteúdo.', { limite: 16384 }) }
}
/** Rebuilds financial data rather than trusting copies or a client hash. */
export function conferirCriacaoParcelada(v: unknown, eventoId: string): Resultado<ComandoCriacaoParcelada> {
  if (!registro(v) || !camposPermitidos(v, ['serieId', 'criacao']) || !idCartaoValido(v.serieId) || !registro(v.criacao) || !camposPermitidos(v.criacao, ['dados', 'referencias', 'calculo']) || !registro(v.criacao.dados) || !registro(v.criacao.calculo) || !/^criarSerie__[A-Za-z0-9-]{1,64}$/.test(eventoId) || !eventoParceladoValido(eventoId)) return falha('esquemaIncompativel', 'Comando de criação incompatível.')
  const c = v.criacao, dados = v.criacao.dados, calc = v.criacao.calculo
  if (!registro(dados.parcelas) || typeof dados.numeroInicial !== 'number') return falha('esquemaIncompativel', 'Cronograma de criação incompatível.')
  const primeira = dados.parcelas[posicaoParcelada(dados.numeroInicial)]
  if (!registro(primeira)) return falha('esquemaIncompativel', 'Primeira posição ausente.')
  const entrada = { ...Object.fromEntries(Object.entries(dados).filter(([k]) => !['parcelas', 'competencias'].includes(k))), referencias: c.referencias, calculo: calc.tipo === 'total' ? { tipo: 'total', totalCentavos: calc.totalCentavos } : calc.tipo === 'porParcela' ? { tipo: 'porParcela', valorCentavos: calc.valorCentavos } : { tipo: 'explicito' }, ...(dados.modo === 'mensal' ? { primeiroVencimento: primeira.vencimento, primeiraCompetencia: primeira.competenciaPlanejamento } : { cronograma: Object.entries(dados.parcelas).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, row]) => registro(row) ? { numero: row.numero, valorCentavos: row.valorCentavos, vencimento: row.vencimento, competenciaPlanejamento: row.competenciaPlanejamento } : null) }), ...(typeof primeira.observacao === 'string' ? { observacao: primeira.observacao } : {}) }
  const plano = prepararCriacao(entrada, eventoId)
  if (!plano.ok) return plano
  const result: CriacaoParcelada = { dados: plano.valor.dados, referencias: plano.valor.referencias, calculo: plano.valor.calculo }
  try { return canonicoParcelado(result) === canonicoParcelado(c) ? sucesso({ serieId: v.serieId, criacao: result }) : falha('esquemaIncompativel', 'O manifesto diverge do cronograma calculado.') }
  catch { return falha('esquemaIncompativel', 'Manifesto de criação incompatível.') }
}
