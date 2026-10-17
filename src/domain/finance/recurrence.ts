import { competencia, dataCalendario, dataNaCompetencia } from './calendar'
import { camposPermitidos, falha, registro, sucesso, texto, versaoValida, umDe } from './errors'
import type { Resultado } from './errors'
import { idAvulsoValido, identidadeNatural } from './identity'
import { valorPositivo } from './money'
import { derivarLiquidacao, idValido, validarSnapshot } from './settlement'

export type MoldeRecorrencia = Readonly<{ id: string; uid: string; schemaVersion: number; version: number; tipo: 'receita' | 'obrigacaoExterna'; descricao: string; categoriaId: string; valorCentavos: number; estimado: boolean; inicio: string; fim?: string; diaAncora: number; frequencia: 'mensal'; estado: 'ativa' | 'encerrada' }>
type OcorrenciaBase = Readonly<{ id: string; uid: string; schemaVersion: number; version: number; recorrenciaId: string; recorrenciaVersion: number; competenciaOcorrencia: string; competenciaPlanejamento: string; descricao: string; categoriaId: string; valorCentavos: number; estimado: boolean; estadoObrigacao: 'ativa' | 'cancelada'; materializada: boolean }>
export type Ocorrencia = OcorrenciaBase & (Readonly<{ tipo: 'receita'; dataPrevista: string }> | Readonly<{ tipo: 'obrigacaoExterna'; vencimento: string; dataConsumo: string }>)
const invalido = () => falha('valorInvalido', 'Informe uma recorrência ou ocorrência válida, com valor e datas explícitos.')
function validarMolde(input: unknown): Resultado<MoldeRecorrencia> {
  if (!registro(input) || !camposPermitidos(input, ['id', 'uid', 'schemaVersion', 'version', 'tipo', 'descricao', 'categoriaId', 'valorCentavos', 'estimado', 'inicio', 'fim', 'diaAncora', 'frequencia', 'estado']) || !idAvulsoValido(input.id) || !idAvulsoValido(input.uid) || !versaoValida(input.version) || !umDe(input.tipo, ['receita', 'obrigacaoExterna']) || !texto(input.descricao, 120) || !idAvulsoValido(input.categoriaId) || !valorPositivo(input.valorCentavos).ok || typeof input.estimado !== 'boolean' || !dataCalendario(input.inicio).ok || input.frequencia !== 'mensal' || !umDe(input.estado, ['ativa', 'encerrada']) || !dataNaCompetencia('2026-01', input.diaAncora).ok || (input.fim !== undefined && (!dataCalendario(input.fim).ok || (input.fim as string) < (input.inicio as string))) || (input.estado === 'encerrada' && input.fim === undefined)) return invalido()
  if (input.schemaVersion !== 1) return falha('esquemaIncompativel', 'O molde usa um formato não suportado.')
  return sucesso({ ...input } as MoldeRecorrencia)
}
function validarOcorrencia(input: unknown): Resultado<Ocorrencia> {
  if (!registro(input) || !camposPermitidos(input, ['id', 'uid', 'schemaVersion', 'version', 'recorrenciaId', 'recorrenciaVersion', 'competenciaOcorrencia', 'competenciaPlanejamento', 'descricao', 'categoriaId', 'valorCentavos', 'estimado', 'estadoObrigacao', 'materializada', 'tipo', 'dataPrevista', 'vencimento', 'dataConsumo']) || !idValido(input.id) || !idAvulsoValido(input.uid) || !idAvulsoValido(input.recorrenciaId) || !versaoValida(input.version) || !versaoValida(input.recorrenciaVersion) || !competencia(input.competenciaOcorrencia).ok || !competencia(input.competenciaPlanejamento).ok || !texto(input.descricao, 120) || !idAvulsoValido(input.categoriaId) || !valorPositivo(input.valorCentavos).ok || typeof input.estimado !== 'boolean' || typeof input.materializada !== 'boolean' || !umDe(input.estadoObrigacao, ['ativa', 'cancelada'])) return invalido()
  if (input.schemaVersion !== 1) return falha('esquemaIncompativel', 'A ocorrência usa formato não suportado.')
  const identity = identidadeNatural(['ocorrencia', input.recorrenciaId, input.competenciaOcorrencia])
  if (!identity.ok || identity.valor !== input.id) return falha('referenciaInvalida', 'A ocorrência não corresponde à sua identidade natural.')
  if (input.tipo === 'receita' ? !dataCalendario(input.dataPrevista).ok || input.vencimento !== undefined || input.dataConsumo !== undefined : input.tipo !== 'obrigacaoExterna' || !dataCalendario(input.vencimento).ok || !dataCalendario(input.dataConsumo).ok || input.dataPrevista !== undefined) return invalido()
  return sucesso({ ...input } as Ocorrencia)
}
export function projetarOcorrencias(input: unknown, competencias: unknown, existentes: unknown): Resultado<readonly Ocorrencia[]> {
  const mold = validarMolde(input)
  if (!mold.ok) return mold
  if (!Array.isArray(competencias) || !competencias.every(v => competencia(v).ok) || new Set(competencias).size !== competencias.length || !Array.isArray(existentes)) return invalido()
  const existing = new Map<string, Ocorrencia>()
  for (const item of existentes) {
    const valid = validarOcorrencia(item)
    if (!valid.ok) return valid
    if (valid.valor.uid !== mold.valor.uid || valid.valor.recorrenciaId !== mold.valor.id || valid.valor.tipo !== mold.valor.tipo || !valid.valor.materializada || existing.has(valid.valor.id)) return falha('referenciaInvalida', 'A ocorrência existente está fora do molde ou repetida.')
    if (valid.valor.recorrenciaVersion > mold.valor.version) return falha('conflitoVersao', 'Recarregue a versão atual do molde.')
    existing.set(valid.valor.id, valid.valor)
  }
  const result: Ocorrencia[] = []
  for (const period of (competencias as string[]).toSorted()) {
    const id = identidadeNatural(['ocorrencia', mold.valor.id, period]), date = dataNaCompetencia(period, mold.valor.diaAncora)
    if (!id.ok) return id
    if (!date.ok) return date
    const prior = existing.get(id.valor)
    if (prior) { result.push({ ...prior }); continue }
    if (date.valor < mold.valor.inicio || mold.valor.fim && date.valor > mold.valor.fim) continue
    const common: OcorrenciaBase = { id: id.valor, uid: mold.valor.uid, schemaVersion: 1, version: 1, recorrenciaId: mold.valor.id, recorrenciaVersion: mold.valor.version, competenciaOcorrencia: period, competenciaPlanejamento: period, descricao: mold.valor.descricao, categoriaId: mold.valor.categoriaId, valorCentavos: mold.valor.valorCentavos, estimado: mold.valor.estimado, estadoObrigacao: 'ativa', materializada: false }
    result.push(mold.valor.tipo === 'receita' ? { ...common, tipo: 'receita', dataPrevista: date.valor } : { ...common, tipo: 'obrigacaoExterna', vencimento: date.valor, dataConsumo: date.valor })
  }
  return sucesso(result)
}
export type PropostaConfirmacaoOcorrencia = Readonly<{ ocorrencia: Ocorrencia; snapshot?: Extract<ReturnType<typeof validarSnapshot>, { ok: true }>['valor'] }>
export function confirmarValorOcorrencia(contexto: unknown, valorDefinitivo: unknown, expectedVersion: unknown): Resultado<PropostaConfirmacaoOcorrencia> {
  if (!registro(contexto) || !camposPermitidos(contexto, ['ocorrencia', 'snapshot'])) return invalido()
  const occurrence = validarOcorrencia(contexto.ocorrencia), amount = valorPositivo(valorDefinitivo)
  if (!occurrence.ok) return occurrence
  if (!amount.ok) return amount
  const o = occurrence.valor
  if (o.version !== expectedVersion) return falha('conflitoVersao', 'Recarregue a ocorrência antes de confirmar.', { versaoAtual: o.version, recuperacao: 'reler' })
  if (o.estadoObrigacao !== 'ativa') return invalido()
  if (!o.materializada) {
    if (contexto.snapshot !== undefined) return invalido()
    return sucesso({ ocorrencia: { ...o, valorCentavos: amount.valor, estimado: false, materializada: true } as Ocorrencia, snapshot: undefined })
  }
  const target = validarSnapshot(contexto.snapshot)
  if (!target.ok) return target
  const s = target.valor, date = o.tipo === 'receita' ? o.dataPrevista : o.vencimento
  if (s.uid !== o.uid || s.alvo.id !== o.id || s.alvo.tipo !== (o.tipo === 'receita' ? 'receita' : 'obrigacaoExternaAvulsa') || s.valorOriginalCentavos !== o.valorCentavos || s.estimado !== o.estimado || s.version !== o.version || s.vencimento !== date || s.estadoObrigacao !== o.estadoObrigacao) return falha('referenciaInvalida', 'O snapshot não corresponde à ocorrência.')
  const summary = derivarLiquidacao(s, date)
  if (!summary.ok) return summary
  if (summary.valor.liquidadoLiquidoCentavos !== 0) return falha('valorInvalido', 'Corrija explicitamente a liquidação antes de alterar o valor confirmado.')
  const version = o.version + 1
  if (!versaoValida(version)) return invalido()
  const next = validarSnapshot({ ...s, valorOriginalCentavos: amount.valor, estimado: false, version, revisao: { antes: version, depois: version } })
  return next.ok ? sucesso({ ocorrencia: { ...o, valorCentavos: amount.valor, estimado: false, version } as Ocorrencia, snapshot: next.valor }) : next
}
