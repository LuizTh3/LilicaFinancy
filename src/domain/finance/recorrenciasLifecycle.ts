import { competencia, dataCalendario } from './calendar'
import { camposPermitidos, falha, registro, sucesso, texto, versaoValida } from './errors'
import type { Resultado } from './errors'
import type { OcorrenciaRecorrente, SerieRecorrente } from './contracts/recorrencias'
import { validarOcorrenciaRecorrente, validarSerieRecorrente } from './recorrenciasValidation'
import { valorPositivo } from './money'

type Contexto = Readonly<{ uid: string; hoje: string }>
const erro = () => falha('referenciaInvalida', 'Confira versões, alcance e elegibilidade da ocorrência.', { recuperacao: 'reler' })
function serieBase(input: unknown, comando: unknown, ctx: Contexto): Resultado<SerieRecorrente> {
  const s = validarSerieRecorrente(input)
  if (!s.ok) return s
  if (s.valor.uid !== ctx.uid || !dataCalendario(ctx.hoje).ok || !registro(comando) || !versaoValida(s.valor.version + 1)) return erro()
  return comando.expectedVersionSerie === s.valor.version ? s : falha('conflitoVersao', 'A série mudou. Refaça a prévia.', { recuperacao: 'reler', versaoAtual: s.valor.version })
}
/** Virtual proposals require server-confirmed slot absence in their future atomic writer. */
function ocorrenciaBase(input: unknown, s: SerieRecorrente, comando: Record<string, unknown>): Resultado<{ o: OcorrenciaRecorrente; virtual: boolean }> {
  if (!registro(input)) return erro()
  const { fonte, ...raw } = input, virtual = raw.estado === 'virtual'
  if ('fonte' in input && (virtual ? fonte !== 'virtual' : fonte !== 'persistida')) return erro()
  const o = validarOcorrenciaRecorrente({ ...raw, ...(virtual ? { estado: 'persistida' } : {}) })
  if (!o.ok) return o
  if (o.valor.uid !== s.uid || o.valor.serieId !== s.id || o.valor.natureza !== s.natureza || o.valor.version > s.version || o.valor.revisaoVersion > s.version || o.valor.estado !== 'persistida' || comando.expectedVersionOcorrencia !== (virtual ? 0 : o.valor.version)) return erro()
  if (virtual) {
    const f = o.valor.financeiro
    const data = f && ('dataCompra' in f ? f.dataCompra : f.dataPrevista ?? f.vencimento)
    if (s.estado !== 'ativa' || o.valor.mesReferencia < s.inicio.slice(0, 7) || s.terminoOriginal && o.valor.mesReferencia > s.terminoOriginal.slice(0, 7) || !data || data < s.inicio || s.terminoOriginal && data > s.terminoOriginal) return erro()
  }
  return sucesso({ o: o.valor, virtual })
}
function nextSerie(s: SerieRecorrente) { return validarSerieRecorrente({ ...s, version: s.version + 1 }) }

export function prepararSupressaoRecorrente(serieInput: unknown, ocorrenciaInput: unknown, comando: unknown, ctx: Contexto) {
  const serie = serieBase(serieInput, comando, ctx)
  if (!serie.ok) return serie
  if (!registro(comando) || !camposPermitidos(comando, ['tipo', 'expectedVersionSerie', 'expectedVersionOcorrencia', 'motivo']) || !['pular', 'cancelar'].includes(String(comando.tipo)) || !texto(comando.motivo, 1000)) return erro()
  const original = ocorrenciaBase(ocorrenciaInput, serie.valor, comando)
  if (!original.ok) return original
  const { o, virtual } = original.valor
  if (comando.tipo === 'pular' ? !virtual : virtual) return erro()
  if (!virtual && o.natureza === 'assinaturaCartao') return falha('configuracaoPendente', 'Cancelamento de assinatura materializada exige atualização recíproca da fatura.')
  if (o.financeiro && 'jaLiquidada' in o.financeiro && o.financeiro.jaLiquidada) return erro()
  const { financeiro: _, capacidadeItem: __, ...semFinanceiro } = o
  const ocorrencia = validarOcorrenciaRecorrente({ ...(virtual ? semFinanceiro : o), version: virtual ? 1 : o.version + 1, estado: virtual ? 'pulada' : 'cancelada', excecaoIndividual: true, motivoSupressao: comando.motivo.trim() })
  const s = nextSerie(serie.valor)
  return !ocorrencia.ok ? ocorrencia : !s.ok ? s : sucesso({ serie: s.valor, ocorrencia: ocorrencia.valor, antes: virtual ? null : o, producaoHabilitada: false as const })
}

export function prepararConfirmacaoValorRecorrente(serieInput: unknown, ocorrenciaInput: unknown, comando: unknown, ctx: Contexto) {
  const serie = serieBase(serieInput, comando, ctx)
  if (!serie.ok) return serie
  if (!registro(comando) || !camposPermitidos(comando, ['expectedVersionSerie', 'expectedVersionOcorrencia', 'valorCentavos']) || !valorPositivo(comando.valorCentavos).ok) return erro()
  const original = ocorrenciaBase(ocorrenciaInput, serie.valor, comando)
  if (!original.ok) return original
  const { o, virtual } = original.valor, f = o.financeiro
  if (o.natureza === 'assinaturaCartao') return falha('configuracaoPendente', 'Confirmar assinatura exige proposta recíproca com o controle financeiro da fatura.')
  if (!f || !('jaLiquidada' in f) || f.jaLiquidada || !f.estimado) return erro()
  const ocorrencia = validarOcorrenciaRecorrente({ ...o, version: virtual ? 1 : o.version + 1, financeiro: { ...f, estimado: false, valorCentavos: comando.valorCentavos }, excecaoIndividual: true })
  const s = nextSerie(serie.valor)
  return !ocorrencia.ok ? ocorrencia : !s.ok ? s : sucesso({ serie: s.valor, ocorrencia: ocorrencia.valor, antes: virtual ? null : o, producaoHabilitada: false as const })
}

/** Only S changes. The bounded list is a preview of known confirmed commitments, never a deletion set. */
export function prepararEncerramentoRecorrente(serieInput: unknown, conhecidas: unknown, comando: unknown, ctx: Contexto) {
  const serie = serieBase(serieInput, comando, ctx)
  if (!serie.ok) return serie
  const s = serie.valor
  if (!registro(comando) || !camposPermitidos(comando, ['expectedVersionSerie', 'primeiroMesExcluido', 'motivo']) || !texto(comando.motivo, 1000) || !competencia(comando.primeiroMesExcluido).ok || (comando.primeiroMesExcluido as string) < ctx.hoje.slice(0, 7) || (comando.primeiroMesExcluido as string) < s.inicio.slice(0, 7) || s.estado !== 'ativa' || !Array.isArray(conhecidas) || conhecidas.length > 100) return erro()
  const preservadas: OcorrenciaRecorrente[] = [], ids = new Set<string>()
  for (const raw of conhecidas) {
    const o = validarOcorrenciaRecorrente(raw)
    if (!o.ok) return o
    if (o.valor.uid !== s.uid || o.valor.serieId !== s.id || o.valor.natureza !== s.natureza || o.valor.version > s.version || o.valor.revisaoVersion > s.version || ids.has(o.valor.id)) return erro()
    ids.add(o.valor.id)
    if (o.valor.estado === 'persistida' && o.valor.mesReferencia >= (comando.primeiroMesExcluido as string)) preservadas.push(o.valor)
  }
  const encerrada = validarSerieRecorrente({ ...s, version: s.version + 1, estado: 'encerrada', encerradaDesdeMes: comando.primeiroMesExcluido })
  return encerrada.ok ? sucesso({ serie: encerrada.valor, confirmadasPreservadas: Object.freeze(preservadas), escopoLista: 'somenteOcorrenciasFornecidas' as const, motivo: comando.motivo.trim(), producaoHabilitada: false as const }) : encerrada
}
