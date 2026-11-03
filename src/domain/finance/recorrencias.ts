import { camposPermitidos, falha, registro, sucesso, versaoValida } from './errors'
import type { Resultado } from './errors'
import type { EntradaProjecaoRecorrente, OcorrenciaRecorrente, RevisaoRecorrente, SerieRecorrente } from './contracts/recorrencias'
import { idSerieRecorrenteValido, identidadeRevisaoRecorrente, validarOcorrenciaRecorrente, validarRevisaoRecorrente, validarSerieRecorrente } from './recorrenciasValidation'
import { projetarRecorrencias } from './recorrenciasProjection'

const erro = () => falha('valorInvalido', 'Confira natureza, intervalo, dia e dados do padrão mensal.', { recuperacao: 'corrigir' })
const camposPadrao = ['descricao', 'categoriaId', 'valorCentavos', 'estimado', 'diaAncora', 'titularId', 'contaPrevistaId', 'cartaoId', 'etiquetaIds', 'observacao']
/** Creation is separate from generation: no incoming loan funds or settlement is inferred. */
export function prepararCadastroRecorrente(input: unknown, meta: Readonly<{ uid: string; serieId: string }>): Resultado<{ serie: SerieRecorrente; revisao: RevisaoRecorrente }> {
  if (!registro(input) || !camposPermitidos(input, ['natureza', 'inicio', 'terminoOriginal', ...camposPadrao]) || !meta.uid || !idSerieRecorrenteValido(meta.serieId)) return erro()
  const serie = validarSerieRecorrente({ uid: meta.uid, id: meta.serieId, version: 1, natureza: input.natureza, inicio: input.inicio, estado: 'ativa', ...('terminoOriginal' in input ? { terminoOriginal: input.terminoOriginal } : {}) })
  if (!serie.ok) return serie
  if (serie.valor.natureza === 'assinaturaCartao' ? !('cartaoId' in input) || 'titularId' in input || 'contaPrevistaId' in input : 'cartaoId' in input) return erro()
  const inicioMes = serie.valor.inicio.slice(0, 7)
  const revisao = validarRevisaoRecorrente({ ...Object.fromEntries(camposPadrao.filter(k => k in input).map(k => [k, input[k]])), id: identidadeRevisaoRecorrente(meta.serieId, inicioMes), uid: meta.uid, serieId: meta.serieId, version: 1, inicioMes })
  return revisao.ok ? sucesso({ serie: serie.valor, revisao: revisao.valor }) : revisao
}

/** Bounded external-only proposal. A writer must serialize S, absent slots and receipt atomically. */
export function prepararGeracaoRecorrente(input: EntradaProjecaoRecorrente): Resultado<{ novas: readonly OcorrenciaRecorrente[]; existentes: readonly OcorrenciaRecorrente[]; series: readonly SerieRecorrente[]; producaoHabilitada: false }> {
  const projecao = projetarRecorrencias(input)
  if (!projecao.ok) return projecao
  if (!projecao.valor.completo) return falha('integridadeIndeterminada', 'Reconcile séries, revisões e todos os slots do período antes de gerar.', { recuperacao: 'reler' })
  if (new Set(input.series.map(s => s.id)).size !== input.series.length) return erro()
  const virtuais = projecao.valor.linhas.filter(o => o.fonte === 'virtual')
  if (virtuais.length > 12) return falha('limiteOperacional', 'Selecione até doze ocorrências por operação; nenhuma foi gerada.', { limite: 12 })
  if (virtuais.some(o => o.natureza === 'assinaturaCartao')) return falha('configuracaoPendente', 'A materialização de assinatura exige proposta recíproca com o controle financeiro da fatura.')
  const novas: OcorrenciaRecorrente[] = [], alteradas = new Set<string>()
  for (const linha of virtuais) {
    const { fonte: _, ...o } = linha
    const valid = validarOcorrenciaRecorrente({ ...o, estado: 'persistida' })
    if (!valid.ok) return valid
    novas.push(valid.valor); alteradas.add(valid.valor.serieId)
  }
  const series: SerieRecorrente[] = []
  for (const raw of input.series) {
    if (alteradas.has(raw.id) && !versaoValida(raw.version + 1)) return erro()
    const valid = validarSerieRecorrente({ ...raw, version: raw.version + Number(alteradas.has(raw.id)) })
    if (!valid.ok) return valid
    series.push(valid.valor)
  }
  const existentes: OcorrenciaRecorrente[] = []
  for (const raw of input.persistidas) {
    const valid = validarOcorrenciaRecorrente(raw)
    if (!valid.ok) return valid
    existentes.push(valid.valor)
  }
  return sucesso({ novas: Object.freeze(novas), existentes: Object.freeze(existentes), series: Object.freeze(series), producaoHabilitada: false })
}
