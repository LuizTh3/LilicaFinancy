import { dataCalendario } from './calendar'
import { camposPermitidos, falha, registro, sucesso, texto, versaoValida } from './errors'
import type { Resultado } from './errors'
import type { FatoLiquidacao, SnapshotAlvo } from './contracts/commands'
import type { OcorrenciaRecorrente, SerieRecorrente } from './contracts/recorrencias'
import { avaliarAjuste, avaliarLiquidacao, derivarLiquidacao, idValido, validarFatos } from './settlement'
import { validarOcorrenciaRecorrente, validarSerieRecorrente } from './recorrenciasValidation'

type Contexto = Readonly<{ uid: string; hoje: string; historicoCompleto: boolean; fatos: readonly FatoLiquidacao[]; contas: SnapshotAlvo['contas'] }>
type Base = Readonly<{ serie: SerieRecorrente; ocorrencia: OcorrenciaRecorrente; snapshot: SnapshotAlvo }>
const erro = () => falha('integridadeIndeterminada', 'Confira ocorrência definitiva, versões e histórico completo de liquidação.', { recuperacao: 'reler' })
function preparar(serieInput: unknown, ocorrenciaInput: unknown, comando: unknown, ctx: Contexto, campos: readonly string[]): Resultado<Base> {
  const serie = validarSerieRecorrente(serieInput), ocorrencia = validarOcorrenciaRecorrente(ocorrenciaInput)
  if (!serie.ok) return serie
  if (!ocorrencia.ok) return ocorrencia
  const s = serie.valor, o = ocorrencia.valor, f = o.financeiro
  if (s.uid !== ctx.uid || o.uid !== ctx.uid || o.serieId !== s.id || o.natureza !== s.natureza || o.version > s.version || o.revisaoVersion > s.version || o.estado !== 'persistida' || !f || !('jaLiquidada' in f) || f.estimado || !dataCalendario(ctx.hoje).ok || !ctx.historicoCompleto || !versaoValida(s.version + 1) || !versaoValida(o.version + 1)) return erro()
  if (!registro(comando) || !camposPermitidos(comando, ['operationKey', 'expectedVersionSerie', 'expectedVersionOcorrencia', ...campos]) || typeof comando.operationKey !== 'string' || !/^[A-Za-z0-9-]{1,64}$/.test(comando.operationKey)) return erro()
  if (comando.expectedVersionSerie !== s.version || comando.expectedVersionOcorrencia !== o.version) return falha('conflitoVersao', 'A série ou ocorrência mudou. Refaça a prévia.', { recuperacao: 'reler' })
  const fatos = validarFatos(ctx.fatos, ctx.uid)
  if (!fatos.ok) return fatos
  const tipo = o.natureza === 'receitaExterna' ? 'receita' as const : 'obrigacaoExternaAvulsa' as const
  if (fatos.valor.some(p => p.alvo.id !== o.id || p.alvo.tipo !== tipo || p.dataEfetiva > ctx.hoje)) return erro()
  const snapshot: SnapshotAlvo = { uid: ctx.uid, schemaVersion: 1, version: o.version, alvo: { tipo, id: o.id }, completo: true, revisao: { antes: o.version, depois: o.version }, estadoObrigacao: 'ativa', vencimento: (f.dataPrevista ?? f.vencimento)!, valorOriginalCentavos: f.valorCentavos, origemId: o.id, estimado: false, contas: ctx.contas, fatos: fatos.valor, creditos: [] }
  const resumo = derivarLiquidacao(snapshot, ctx.hoje)
  if (!resumo.ok || resumo.valor.liquidadoLiquidoCentavos !== f.liquidadoLiquidoCentavos || f.jaLiquidada !== fatos.valor.some(p => p.tipo === 'pagamento' || p.tipo === 'recebimento')) return erro()
  return sucesso({ serie: s, ocorrencia: o, snapshot })
}
function finalizar(base: Base, snapshot: SnapshotAlvo, fato: FatoLiquidacao, ctx: Contexto) {
  const resumo = derivarLiquidacao(snapshot, ctx.hoje)
  if (!resumo.ok) return resumo
  const serie = validarSerieRecorrente({ ...base.serie, version: base.serie.version + 1 })
  const ocorrencia = validarOcorrenciaRecorrente({ ...base.ocorrencia, version: base.ocorrencia.version + 1, financeiro: { ...base.ocorrencia.financeiro, liquidadoLiquidoCentavos: resumo.valor.liquidadoLiquidoCentavos, jaLiquidada: true } })
  return !serie.ok ? serie : !ocorrencia.ok ? ocorrencia : sucesso({ serie: serie.valor, ocorrencia: ocorrencia.valor, fato, producaoHabilitada: false as const })
}
export function planejarLiquidacaoRecorrente(serie: unknown, ocorrencia: unknown, comando: unknown, ctx: Contexto) {
  const base = preparar(serie, ocorrencia, comando, ctx, ['valorCentavos', 'contaId', 'dataEfetiva'])
  if (!base.ok) return base
  if (!registro(comando) || !dataCalendario(comando.dataEfetiva).ok || (comando.dataEfetiva as string) > ctx.hoje) return erro()
  const tipo = base.valor.ocorrencia.natureza === 'receitaExterna' ? 'recebimento' : 'pagamento', eventoId = `${tipo === 'recebimento' ? 'receberOcorrencia' : 'pagarOcorrencia'}__${comando.operationKey}`
  const proposta = avaliarLiquidacao(base.valor.snapshot, { tipo, id: eventoId, operacaoId: eventoId, expectedVersion: base.valor.ocorrencia.version, valorCentavos: comando.valorCentavos, contaId: comando.contaId, dataEfetiva: comando.dataEfetiva })
  return proposta.ok ? finalizar(base.valor, proposta.valor.snapshot, proposta.valor.fatos[0], ctx) : proposta
}
export function planejarReversaoRecorrente(serie: unknown, ocorrencia: unknown, comando: unknown, ctx: Contexto) {
  const base = preparar(serie, ocorrencia, comando, ctx, ['originalId', 'motivo'])
  if (!base.ok) return base
  if (!registro(comando) || !idValido(comando.originalId) || !texto(comando.motivo, 1000)) return erro()
  const original = base.valor.snapshot.fatos.find(p => p.id === comando.originalId && (p.tipo === 'pagamento' || p.tipo === 'recebimento'))
  if (!original || base.valor.snapshot.fatos.some(p => p.originalId === original.id)) return erro()
  const tipo = original.tipo === 'pagamento' ? 'reversaoPagamento' : 'reversaoRecebimento', eventoId = `${tipo === 'reversaoPagamento' ? 'reverterPagamento' : 'reverterRecebimento'}__${comando.operationKey}`
  const proposta = avaliarAjuste(base.valor.snapshot, { tipo, id: eventoId, operacaoId: eventoId, originalId: original.id, valorCentavos: original.valorCentavos, dataEfetiva: original.dataEfetiva, motivo: comando.motivo.trim(), expectedVersion: base.valor.ocorrencia.version })
  if (!proposta.ok) return proposta
  const snapshot = proposta.valor.snapshots[0], fato = snapshot.fatos.find(p => p.id === eventoId)
  if (!fato) return erro()
  const final = finalizar(base.valor, snapshot, fato, ctx)
  return final.ok ? sucesso({ ...final.valor, marcador: { ocorrenciaId: base.valor.ocorrencia.id, originalId: original.id, reversaoId: eventoId } }) : final
}
