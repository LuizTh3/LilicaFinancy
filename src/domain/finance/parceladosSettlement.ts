import { dataCalendario } from './calendar'
import { idCartaoValido } from './cartoes'
import type { FatoLiquidacao, SnapshotAlvo } from './contracts/commands'
import type { SerieParcelada } from './contracts/parcelados'
import { camposPermitidos, falha, registro, sucesso } from './errors'
import type { Resultado } from './errors'
import { validarSerieParcelada } from './parcelados'
import { identidadeParcelaExterna, instanteParceladoValido, posicaoParcelada } from './parceladosValidation'
import { avaliarAjuste, avaliarLiquidacao, derivarLiquidacao, validarFatos } from './settlement'
import type { ResumoLiquidacao } from './settlement'

export type ContextoLiquidacaoParcelada = Readonly<{
  uid: string; hoje: string; instante: number; historicoCompleto: boolean
  // Complete ledger of the selected obligation, not the visible history page.
  fatos: readonly FatoLiquidacao[]; contas: SnapshotAlvo['contas']
}>
const invalid = () => falha('referenciaInvalida', 'Confira a parcela e seu histórico completo.', { recuperacao: 'reler' })
function snapshotParcela(input: unknown, numero: number, ctx: ContextoLiquidacaoParcelada): Resultado<{ serie: SerieParcelada; snapshot: SnapshotAlvo }> {
  const serie = validarSerieParcelada(input), id = serie.ok ? identidadeParcelaExterna(serie.valor.id, numero) : serie
  if (!serie.ok) return serie
  if (!id.ok) return id
  if (serie.valor.uid !== ctx.uid || !dataCalendario(ctx.hoje).ok || !instanteParceladoValido(ctx.instante)) return invalid()
  if (!ctx.historicoCompleto) return falha('indisponivel', 'O histórico da parcela ainda está incompleto.', { recuperacao: 'reler' })
  const row = serie.valor.parcelas[posicaoParcelada(numero)], fatos = validarFatos(ctx.fatos, ctx.uid)
  if (!row || !fatos.ok || fatos.valor.some(f => f.alvo.tipo !== 'parcelaExterna' || f.alvo.id !== id.valor || f.dataEfetiva > ctx.hoje)) return invalid()
  const snapshot: SnapshotAlvo = { uid: ctx.uid, schemaVersion: 1, version: serie.valor.version, alvo: { tipo: 'parcelaExterna', id: id.valor }, completo: true, revisao: { antes: serie.valor.version, depois: serie.valor.version }, estadoObrigacao: row.estadoObrigacao, vencimento: row.vencimento, valorOriginalCentavos: row.valorCentavos, origemId: serie.valor.id, contas: ctx.contas, fatos: fatos.valor, creditos: [] }
  const resumo = derivarLiquidacao(snapshot, ctx.hoje)
  if (!resumo.ok || resumo.valor.liquidadoLiquidoCentavos !== row.liquidadoLiquidoCentavos || row.jaLiquidada !== fatos.valor.some(f => f.tipo === 'pagamento')) return invalid()
  return sucesso({ serie: serie.valor, snapshot })
}
export function resumoParcelaExterna(input: unknown, numero: number, ctx: ContextoLiquidacaoParcelada): Resultado<ResumoLiquidacao> {
  const snapshot = snapshotParcela(input, numero, ctx)
  return snapshot.ok ? derivarLiquidacao(snapshot.valor.snapshot, ctx.hoje) : snapshot
}
function comandoBase(input: unknown, campos: readonly string[], serie: SerieParcelada): input is Record<string, unknown> & { operationKey: string; numero: number } {
  return registro(input) && camposPermitidos(input, ['operationKey', 'serieId', 'numero', 'expectedVersion', ...campos]) && idCartaoValido(input.operationKey) && input.serieId === serie.id && typeof input.numero === 'number' && Number.isInteger(input.numero) && input.numero >= serie.numeroInicial && input.numero <= serie.quantidadeOriginal
}
function atualizar(serie: SerieParcelada, numero: number, snapshot: SnapshotAlvo, eventoId: string, ctx: ContextoLiquidacaoParcelada): Resultado<SerieParcelada> {
  const resumo = derivarLiquidacao(snapshot, ctx.hoje)
  if (!resumo.ok) return resumo
  const chave = posicaoParcelada(numero), antes = serie.parcelas[chave]
  return validarSerieParcelada({ ...serie, version: serie.version + 1, updatedAt: ctx.instante, ultimoEventoId: eventoId, parcelas: { ...serie.parcelas, [chave]: { ...antes, liquidadoLiquidoCentavos: resumo.valor.liquidadoLiquidoCentavos, jaLiquidada: true, ultimoEventoParcelaId: eventoId } } })
}
export function planejarPagamentoParcela(input: unknown, comando: unknown, ctx: ContextoLiquidacaoParcelada): Resultado<{ serie: SerieParcelada; fato: FatoLiquidacao }> {
  const serie = validarSerieParcelada(input)
  if (!serie.ok) return serie
  if (!instanteParceladoValido(ctx.instante) || ctx.instante < serie.valor.updatedAt) return invalid()
  if (!comandoBase(comando, ['valorCentavos', 'contaId', 'dataEfetiva'], serie.valor)) return invalid()
  if (comando.expectedVersion !== serie.valor.version) return falha('conflitoVersao', 'A série mudou. Confira novamente.', { recuperacao: 'reler' })
  const date = dataCalendario(comando.dataEfetiva)
  if (!date.ok || date.valor > ctx.hoje) return falha('dataInvalida', 'Pagamento exige data efetiva não futura.')
  const snapshot = snapshotParcela(input, comando.numero, ctx)
  if (!snapshot.ok) return snapshot
  const eventoId = `pagarParcela__${comando.operationKey}`
  const plan = avaliarLiquidacao(snapshot.valor.snapshot, { tipo: 'pagamento', id: eventoId, operacaoId: eventoId, valorCentavos: comando.valorCentavos, contaId: comando.contaId, dataEfetiva: date.valor, expectedVersion: serie.valor.version })
  if (!plan.ok) return plan
  const atualizado = atualizar(serie.valor, comando.numero, plan.valor.snapshot, eventoId, ctx)
  return atualizado.ok ? sucesso({ serie: atualizado.valor, fato: plan.valor.fatos[0] }) : atualizado
}
export function planejarReversaoParcela(input: unknown, comando: unknown, ctx: ContextoLiquidacaoParcelada): Resultado<{ serie: SerieParcelada; fato: FatoLiquidacao; marcador: Readonly<{ serieId: string; parcela: string; originalEventoId: string; reversaoEventoId: string; createdAt: number }> }> {
  const serie = validarSerieParcelada(input)
  if (!serie.ok) return serie
  if (!instanteParceladoValido(ctx.instante) || ctx.instante < serie.valor.updatedAt) return invalid()
  if (!comandoBase(comando, ['originalEventoId', 'motivo'], serie.valor) || typeof comando.motivo !== 'string' || !comando.motivo.trim() || [...comando.motivo.trim()].length > 1000) return invalid()
  if (comando.expectedVersion !== serie.valor.version) return falha('conflitoVersao', 'A série mudou. Confira novamente.', { recuperacao: 'reler' })
  const snapshot = snapshotParcela(input, comando.numero, ctx)
  if (!snapshot.ok) return snapshot
  const original = ctx.fatos.find(f => f.id === comando.originalEventoId && f.tipo === 'pagamento')
  if (!original || ctx.fatos.some(f => f.originalId === original.id)) return invalid()
  const eventoId = `reverterPagamento__${comando.operationKey}`
  const plan = avaliarAjuste(snapshot.valor.snapshot, { tipo: 'reversaoPagamento', id: eventoId, operacaoId: eventoId, originalId: original.id, valorCentavos: original.valorCentavos, dataEfetiva: original.dataEfetiva, motivo: comando.motivo.trim(), expectedVersion: serie.valor.version })
  if (!plan.ok) return plan
  const next = plan.valor.snapshots[0], fato = next.fatos.find(f => f.id === eventoId)
  if (!fato) return invalid()
  const atualizado = atualizar(serie.valor, comando.numero, next, eventoId, ctx)
  return atualizado.ok ? sucesso({ serie: atualizado.valor, fato, marcador: { serieId: serie.valor.id, parcela: posicaoParcelada(comando.numero), originalEventoId: original.id, reversaoEventoId: eventoId, createdAt: ctx.instante } }) : atualizado
}
