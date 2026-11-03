import { competencia, dataCalendario } from './calendar'
import { idCartaoValido } from './cartoes'
import type { FinanceiroRecorrente, NaturezaRecorrente, OcorrenciaRecorrente, RevisaoRecorrente, SerieRecorrente } from './contracts/recorrencias'
import { camposPermitidos, falha, registro, sucesso, umDe, versaoValida } from './errors'
import type { Resultado } from './errors'
import { faturaId } from './faturas'
import { centavos, valorPositivo } from './money'

export const idSerieRecorrenteValido = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9-]{1,40}$/.test(v)
export const naturezasRecorrentes: readonly NaturezaRecorrente[] = ['receitaExterna', 'despesaExterna', 'assinaturaCartao']
const bad = () => falha('esquemaIncompativel', 'Série, revisão ou ocorrência recorrente incompatível.', { recuperacao: 'reler' })
const texto = (v: unknown, n: number): v is string => typeof v === 'string' && !!v.trim() && v === v.trim() && [...v].length <= n
export function identidadeOcorrenciaRecorrente(serieId: unknown, mes: unknown): Resultado<string> {
  return idSerieRecorrenteValido(serieId) && competencia(mes).ok ? sucesso(`r10-${serieId}-${(mes as string).replace('-', '')}`) : bad()
}
export const identidadeRevisaoRecorrente = (serie: string, mes: string) => `${serie}-${mes.replace('-', '')}`
export function validarSerieRecorrente(v: unknown): Resultado<SerieRecorrente> {
  if (!registro(v) || !camposPermitidos(v, ['id', 'uid', 'version', 'natureza', 'inicio', 'terminoOriginal', 'estado', 'encerradaDesdeMes']) || !idSerieRecorrenteValido(v.id) || typeof v.uid !== 'string' || !v.uid || !versaoValida(v.version) || !umDe(v.natureza, naturezasRecorrentes) || !dataCalendario(v.inicio).ok || !umDe(v.estado, ['ativa', 'encerrada']) || v.terminoOriginal !== undefined && (!dataCalendario(v.terminoOriginal).ok || (v.terminoOriginal as string) < (v.inicio as string)) || (v.estado === 'encerrada' ? !competencia(v.encerradaDesdeMes).ok : 'encerradaDesdeMes' in v)) return bad()
  return sucesso(Object.freeze({ id: v.id, uid: v.uid, version: v.version, natureza: v.natureza, inicio: v.inicio as string, estado: v.estado, ...(typeof v.terminoOriginal === 'string' ? { terminoOriginal: v.terminoOriginal } : {}), ...(typeof v.encerradaDesdeMes === 'string' ? { encerradaDesdeMes: v.encerradaDesdeMes } : {}) }))
}
function etiquetas(v: Record<string, unknown>): boolean {
  return !('etiquetaIds' in v) || Array.isArray(v.etiquetaIds) && v.etiquetaIds.length <= 5 && v.etiquetaIds.every(idCartaoValido) && new Set(v.etiquetaIds).size === v.etiquetaIds.length && [...v.etiquetaIds].sort().every((id, i) => id === (v.etiquetaIds as string[])[i])
}
const fields = ['descricao', 'categoriaId', 'valorCentavos', 'estimado', 'etiquetaIds', 'observacao']
function financeiroBase(v: Record<string, unknown>): boolean {
  return texto(v.descricao, 120) && idCartaoValido(v.categoriaId) && valorPositivo(v.valorCentavos).ok && typeof v.estimado === 'boolean' && etiquetas(v) && (!('observacao' in v) || texto(v.observacao, 1000))
}
export function validarRevisaoRecorrente(v: unknown): Resultado<RevisaoRecorrente> {
  if (!registro(v) || !camposPermitidos(v, [...fields, 'id', 'uid', 'serieId', 'version', 'inicioMes', 'fimExclusivo', 'diaAncora', 'titularId', 'contaPrevistaId', 'cartaoId']) || !financeiroBase(v) || !idSerieRecorrenteValido(v.serieId) || typeof v.uid !== 'string' || !v.uid || !versaoValida(v.version) || !competencia(v.inicioMes).ok || v.id !== identidadeRevisaoRecorrente(v.serieId, v.inicioMes as string) || 'fimExclusivo' in v && (!competencia(v.fimExclusivo).ok || (v.fimExclusivo as string) <= (v.inicioMes as string)) || typeof v.diaAncora !== 'number' || !Number.isInteger(v.diaAncora) || v.diaAncora < 1 || v.diaAncora > 31 || ['titularId', 'contaPrevistaId', 'cartaoId'].some(k => k in v && !idCartaoValido(v[k]))) return bad()
  return sucesso(Object.freeze({ ...v, ...(Array.isArray(v.etiquetaIds) ? { etiquetaIds: Object.freeze([...v.etiquetaIds]) } : {}) } as RevisaoRecorrente))
}
export function validarFinanceiroRecorrente(v: unknown, natureza: NaturezaRecorrente): v is FinanceiroRecorrente {
  if (!registro(v) || !financeiroBase(v)) return false
  if (natureza === 'assinaturaCartao') return camposPermitidos(v, [...fields, 'dataCompra', 'cartaoId', 'faturaId', 'competenciaFatura', 'inicioCiclo', 'fechamentoCiclo']) && idCartaoValido(v.cartaoId) && dataCalendario(v.dataCompra).ok && competencia(v.competenciaFatura).ok && v.faturaId === faturaId(v.cartaoId, v.competenciaFatura as string) && dataCalendario(v.inicioCiclo).ok && dataCalendario(v.fechamentoCiclo).ok && (v.inicioCiclo as string) < (v.fechamentoCiclo as string)
  if (!camposPermitidos(v, [...fields, 'competenciaPlanejamento', 'dataPrevista', 'vencimento', 'dataConsumo', 'titularId', 'contaPrevistaId', 'liquidadoLiquidoCentavos', 'jaLiquidada']) || !competencia(v.competenciaPlanejamento).ok || !centavos(v.liquidadoLiquidoCentavos).ok || Number(v.liquidadoLiquidoCentavos) > Number(v.valorCentavos) || typeof v.jaLiquidada !== 'boolean' || !v.jaLiquidada && v.liquidadoLiquidoCentavos !== 0 || ['titularId', 'contaPrevistaId'].some(k => k in v && !idCartaoValido(v[k]))) return false
  return natureza === 'receitaExterna' ? dataCalendario(v.dataPrevista).ok && !('vencimento' in v) && !('dataConsumo' in v) : dataCalendario(v.vencimento).ok && dataCalendario(v.dataConsumo).ok && !('dataPrevista' in v)
}
export function validarOcorrenciaRecorrente(v: unknown): Resultado<OcorrenciaRecorrente> {
  if (!registro(v) || !camposPermitidos(v, ['id', 'uid', 'version', 'serieId', 'mesReferencia', 'natureza', 'revisaoId', 'revisaoVersion', 'estado', 'excecaoIndividual', 'financeiro', 'capacidadeItem', 'motivoSupressao']) || typeof v.uid !== 'string' || !v.uid || !versaoValida(v.version) || !idSerieRecorrenteValido(v.serieId) || !competencia(v.mesReferencia).ok || !umDe(v.natureza, naturezasRecorrentes) || !versaoValida(v.revisaoVersion) || typeof v.revisaoId !== 'string' || !v.revisaoId.startsWith(v.serieId + '-') || !/^[A-Za-z0-9-]+-[0-9]{6}$/.test(v.revisaoId) || typeof v.excecaoIndividual !== 'boolean') return bad()
  const identidade = identidadeOcorrenciaRecorrente(v.serieId, v.mesReferencia)
  if (!identidade.ok || identidade.valor !== v.id) return bad()
  const inicioRevisao = v.revisaoId.slice(v.serieId.length + 1)
  const mesRevisao = `${inicioRevisao.slice(0, 4)}-${inicioRevisao.slice(4)}`
  if (!/^[0-9]{6}$/.test(inicioRevisao) || !competencia(mesRevisao).ok || mesRevisao > (v.mesReferencia as string) || v.revisaoId !== identidadeRevisaoRecorrente(v.serieId, mesRevisao)) return bad()
  if (v.estado === 'pulada') { if (!v.excecaoIndividual || !texto(v.motivoSupressao, 1000) || 'financeiro' in v || 'capacidadeItem' in v) return bad() }
  else {
    if (!umDe(v.estado, ['persistida', 'cancelada']) || !validarFinanceiroRecorrente(v.financeiro, v.natureza)) return bad()
    if (v.estado === 'cancelada' ? !v.excecaoIndividual || !texto(v.motivoSupressao, 1000) || 'liquidadoLiquidoCentavos' in v.financeiro && v.financeiro.liquidadoLiquidoCentavos !== 0 : 'motivoSupressao' in v) return bad()
    if (v.natureza === 'assinaturaCartao') {
      const j = v.capacidadeItem
      if (!registro(j) || !camposPermitidos(j, ['schemaVersion', 'valorOriginalCentavos', 'correcaoAcrescimosCentavos', 'correcaoReducoesCentavos', 'devolvidoCentavos', 'categoriaEfetivaId']) || j.schemaVersion !== 1 || !valorPositivo(j.valorOriginalCentavos).ok || !centavos(j.correcaoAcrescimosCentavos).ok || !centavos(j.correcaoReducoesCentavos).ok || !centavos(j.devolvidoCentavos).ok || j.categoriaEfetivaId !== v.financeiro.categoriaId) return bad()
      const bruto = BigInt(j.valorOriginalCentavos as number) + BigInt(j.correcaoAcrescimosCentavos as number)
      if (bruto > BigInt(Number.MAX_SAFE_INTEGER) || bruto - BigInt(j.correcaoReducoesCentavos as number) - BigInt(j.devolvidoCentavos as number) !== BigInt(v.financeiro.valorCentavos)) return bad()
    } else if ('capacidadeItem' in v) return bad()
  }
  const copy = structuredClone(v)
  if (registro(copy.financeiro)) copy.financeiro = Object.freeze({ ...copy.financeiro, ...(Array.isArray(copy.financeiro.etiquetaIds) ? { etiquetaIds: Object.freeze([...copy.financeiro.etiquetaIds]) } : {}) })
  if (registro(copy.capacidadeItem)) copy.capacidadeItem = Object.freeze(copy.capacidadeItem)
  return sucesso(Object.freeze(copy as OcorrenciaRecorrente))
}
