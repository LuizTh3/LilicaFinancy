import { competencia, dataCalendario } from './calendar'
import { camposPermitidos, falha, registro, sucesso, texto, umDe, versaoValida } from './errors'
import type { Resultado } from './errors'
import { validarCalendarioFatura } from './invoiceCalendar'
import { centavos, somarCentavos, subtrairCentavos, valorPositivo } from './money'
import { idValido, validarFatos } from './settlement'
import { criarCapacidadeItem } from './itemCapacity'
import type { ControleFatura, ContextoLiquidacaoFatura } from './contracts/liquidacoesFaturas'
import type { FatoLiquidacao } from './contracts/commands'
import { instanteTecnicoValido } from './technicalTime'

const erro = () => falha('referenciaInvalida', 'O controle financeiro da fatura é inconsistente. Recarregue os dados completos.', { recuperacao: 'reler' })
const instanteValido = instanteTecnicoValido
const tipos = ['confirmarFatura', 'criarCompra', 'editarCompra', 'cancelarCompra', 'materializarOcorrencia', 'pagarFatura', 'reverterPagamentoErro', 'registrarEncargo', 'corrigirItem', 'estornarConsumo', 'reabrirFatura', 'encerrarRevisao'] as const
const eventoTemOrigem = (tipo: unknown) => ['criarCompra', 'editarCompra', 'cancelarCompra', 'materializarOcorrencia'].includes(String(tipo))
export function validarControleFatura(input: unknown): Resultado<ControleFatura> {
  if (!registro(input) || !camposPermitidos(input, ['uid', 'faturaId', 'cartaoId', 'competencia', 'schemaVersion', 'version', 'exigivelCentavos', 'liquidadoLiquidoCentavos', 'possuiHistoricoPagamento', 'revisaoEstado', 'revisaoEventoId', 'ultimoEventoTipo', 'ultimoEventoId', 'ultimoEventoOrigemId', 'createdAt', 'updatedAt']) || !idValido(input.uid) || !idValido(input.cartaoId) || !competencia(input.competencia).ok || input.faturaId !== `${input.cartaoId}__${input.competencia}` || input.schemaVersion !== 2 || !versaoValida(input.version) || !centavos(input.exigivelCentavos).ok || !centavos(input.liquidadoLiquidoCentavos).ok || (input.liquidadoLiquidoCentavos as number) > (input.exigivelCentavos as number) || typeof input.possuiHistoricoPagamento !== 'boolean' || (!input.possuiHistoricoPagamento && input.liquidadoLiquidoCentavos !== 0) || !umDe(input.revisaoEstado, ['normal', 'reaberta']) || (input.revisaoEstado === 'reaberta' ? !idValido(input.revisaoEventoId) || input.possuiHistoricoPagamento : input.revisaoEventoId !== undefined) || !umDe(input.ultimoEventoTipo, tipos) || !idValido(input.ultimoEventoId) || !input.ultimoEventoId.startsWith(`${input.ultimoEventoTipo}__`) || (eventoTemOrigem(input.ultimoEventoTipo) ? !idValido(input.ultimoEventoOrigemId) : input.ultimoEventoOrigemId !== undefined) || !instanteValido(input.createdAt) || !instanteValido(input.updatedAt) || input.updatedAt < input.createdAt) return erro()
  if (!new RegExp(`^${input.ultimoEventoTipo}__[A-Za-z0-9-]{1,64}$`).test(input.ultimoEventoId)) return erro()
  return sucesso({ ...input } as ControleFatura)
}

/** Pure construction for a proven fresh aggregate, not a legacy backfill or a write. */
export function inicializarControleFatura(input: unknown): Resultado<ControleFatura> {
  if (!registro(input) || !camposPermitidos(input, ['uid', 'faturaId', 'cartaoId', 'competencia', 'exigivelCentavos', 'eventoId', 'origemId', 'instante']) || typeof input.eventoId !== 'string') return erro()
  const tipo = input.eventoId.split('__')[0]
  if (!umDe(tipo, ['confirmarFatura', 'criarCompra', 'materializarOcorrencia']) || tipo === 'confirmarFatura' && (input.exigivelCentavos !== 0 || 'origemId' in input)) return erro()
  return validarControleFatura({ uid: input.uid, faturaId: input.faturaId, cartaoId: input.cartaoId, competencia: input.competencia, exigivelCentavos: input.exigivelCentavos, schemaVersion: 2, version: 1, liquidadoLiquidoCentavos: 0, possuiHistoricoPagamento: false, revisaoEstado: 'normal', ultimoEventoTipo: tipo, ultimoEventoId: input.eventoId, ...(eventoTemOrigem(tipo) ? { ultimoEventoOrigemId: input.origemId } : {}), createdAt: input.instante, updatedAt: input.instante })
}
function contexto(c: ControleFatura, ctx: ContextoLiquidacaoFatura, mutacao = true): Resultado<ControleFatura> {
  const calendario = validarCalendarioFatura(ctx.calendario)
  return ctx.uid === c.uid && dataCalendario(ctx.hoje).ok && (!mutacao || instanteValido(ctx.instante) && ctx.instante >= c.updatedAt) && calendario.ok && calendario.valor.competencia === c.competencia ? sucesso(c) : erro()
}
function preparar(input: unknown, command: unknown, ctx: ContextoLiquidacaoFatura, campos: readonly string[]): Resultado<{ c: ControleFatura; command: Record<string, unknown> }> {
  const valid = validarControleFatura(input)
  if (!valid.ok) return valid
  const c = valid.valor, scope = contexto(c, ctx)
  if (!scope.ok) return scope
  if (!registro(command) || !camposPermitidos(command, ['operationKey', 'expectedVersion', ...campos]) || !idValido(command.operationKey)) return erro()
  if (command.expectedVersion !== c.version) return falha('conflitoVersao', 'A fatura mudou. Recarregue antes de confirmar.', { versaoAtual: c.version, recuperacao: 'reler' })
  if (!versaoValida(c.version + 1)) return falha('limiteOperacional', 'A versão excede o limite suportado.')
  return sucesso({ c, command })
}
function atualizar(c: ControleFatura, tipo: string, key: string, ctx: ContextoLiquidacaoFatura, patch: Partial<ControleFatura>): Resultado<ControleFatura> {
  const { ultimoEventoOrigemId: _, ...semOrigem } = c
  return validarControleFatura({ ...semOrigem, ...patch, version: c.version + 1, ultimoEventoTipo: tipo, ultimoEventoId: `${tipo}__${key}`, updatedAt: ctx.instante })
}
export function resumirControleFatura(input: unknown, ctx: ContextoLiquidacaoFatura) {
  const valid = validarControleFatura(input)
  if (!valid.ok) return valid
  const c = valid.valor, scope = contexto(c, ctx, false)
  if (!scope.ok) return scope
  const pending = subtrairCentavos(c.exigivelCentavos, c.liquidadoLiquidoCentavos)
  if (!pending.ok) return pending
  return sucesso({ exigivelCentavos: c.exigivelCentavos, liquidadoLiquidoCentavos: c.liquidadoLiquidoCentavos, pendenteCentavos: pending.valor, estadoLiquidacao: c.exigivelCentavos === 0 ? 'semExigibilidade' : pending.valor === 0 ? 'liquidada' : c.liquidadoLiquidoCentavos > 0 ? 'parcial' : 'pendente', possuiHistoricoPagamento: c.possuiHistoricoPagamento, revisaoEstado: c.revisaoEstado, atrasada: pending.valor > 0 && ctx.calendario.vencimento < ctx.hoje })
}
export function planejarRevisaoFatura(input: unknown, comando: unknown, ctx: ContextoLiquidacaoFatura): Resultado<ControleFatura> {
  const prep = preparar(input, comando, ctx, ['tipo', 'motivo'])
  if (!prep.ok) return prep
  const { c, command: p } = prep.valor
  if (!umDe(p.tipo, ['reabrirFatura', 'encerrarRevisao']) || !texto(p.motivo, 1000) || c.possuiHistoricoPagamento || ctx.hoje < ctx.calendario.fechamento || (p.tipo === 'reabrirFatura' ? c.revisaoEstado !== 'normal' : c.revisaoEstado !== 'reaberta')) return erro()
  if (p.tipo === 'reabrirFatura') return atualizar(c, p.tipo, p.operationKey as string, ctx, { revisaoEstado: 'reaberta', revisaoEventoId: `reabrirFatura__${p.operationKey}` })
  const { revisaoEventoId: _, ...semRevisao } = c
  return atualizar(semRevisao, p.tipo, p.operationKey as string, ctx, { revisaoEstado: 'normal' })
}
export function planejarPagamentoFatura(input: unknown, comando: unknown, ctx: ContextoLiquidacaoFatura): Resultado<{ controle: ControleFatura; fato: FatoLiquidacao }> {
  const prep = preparar(input, comando, ctx, ['valorCentavos', 'contaId', 'dataEfetiva'])
  if (!prep.ok) return prep
  const { c, command: p } = prep.valor
  if (c.revisaoEstado !== 'normal' || !valorPositivo(p.valorCentavos).ok || !dataCalendario(p.dataEfetiva).ok || (p.dataEfetiva as string) > ctx.hoje || !ctx.conta || ctx.conta.uid !== c.uid || ctx.conta.id !== p.contaId || !idValido(p.contaId) || ctx.conta.estadoCadastro !== 'ativo') return erro()
  const paid = somarCentavos([c.liquidadoLiquidoCentavos, p.valorCentavos])
  if (!paid.ok) return paid
  if (paid.valor > c.exigivelCentavos) return falha('excessoPendente', 'O pagamento excede a pendência da fatura.')
  const next = atualizar(c, 'pagarFatura', p.operationKey as string, ctx, { liquidadoLiquidoCentavos: paid.valor, possuiHistoricoPagamento: true })
  if (!next.ok) return next
  const fato: FatoLiquidacao = { id: next.valor.ultimoEventoId, operacaoId: next.valor.ultimoEventoId, uid: c.uid, schemaVersion: 1, version: 1, tipo: 'pagamento', alvo: { tipo: 'fatura', id: c.faturaId }, valorCentavos: p.valorCentavos as number, contaId: p.contaId, dataEfetiva: p.dataEfetiva as string }
  return sucesso({ controle: next.valor, fato })
}
export function planejarReversaoPagamentoFatura(input: unknown, comando: unknown, ctx: ContextoLiquidacaoFatura): Resultado<{ controle: ControleFatura; fato: FatoLiquidacao; marcador: Readonly<{ originalId: string; reversaoId: string }> }> {
  const prep = preparar(input, comando, ctx, ['original', 'marcadorAusente', 'motivo', 'capacidadeOriginal'])
  if (!prep.ok) return prep
  const { c, command: p } = prep.valor
  const facts = validarFatos([p.original], c.uid)
  if (!facts.ok || p.marcadorAusente !== true || !texto(p.motivo, 1000) || c.revisaoEstado !== 'normal') return erro()
  const original = facts.valor[0]
  const capacidade = p.capacidadeOriginal
  if (!registro(capacidade) || !camposPermitidos(capacidade, ['uid', 'faturaId', 'pagamentoId', 'valorOriginalCentavos', 'reembolsadoCentavos', 'revertido']) || capacidade.uid !== c.uid || capacidade.faturaId !== c.faturaId || capacidade.pagamentoId !== original.id || capacidade.valorOriginalCentavos !== original.valorCentavos || capacidade.reembolsadoCentavos !== 0 || capacidade.revertido !== false) return erro()
  if (original.tipo !== 'pagamento' || original.alvo.tipo !== 'fatura' || original.alvo.id !== c.faturaId || original.dataEfetiva > ctx.hoje || !c.possuiHistoricoPagamento || !ctx.conta || ctx.conta.uid !== c.uid || ctx.conta.id !== original.contaId || !umDe(ctx.conta.estadoCadastro, ['ativo', 'arquivado'])) return erro()
  const paid = subtrairCentavos(c.liquidadoLiquidoCentavos, original.valorCentavos)
  if (!paid.ok) return paid
  const next = atualizar(c, 'reverterPagamentoErro', p.operationKey as string, ctx, { liquidadoLiquidoCentavos: paid.valor })
  if (!next.ok) return next
  const fato: FatoLiquidacao = { ...original, id: next.valor.ultimoEventoId, operacaoId: next.valor.ultimoEventoId, tipo: 'reversaoPagamento', originalId: original.id, motivo: p.motivo }
  return sucesso({ controle: next.valor, fato, marcador: { originalId: original.id, reversaoId: fato.id } })
}
export function planejarEncargoFatura(input: unknown, comando: unknown, ctx: ContextoLiquidacaoFatura) {
  const prep = preparar(input, comando, ctx, ['valorCentavos', 'categoriaId', 'descricao', 'motivo', 'dataEfeito', 'tipoJurosOuEncargo'])
  if (!prep.ok) return prep
  const { c, command: p } = prep.valor
  if (c.revisaoEstado !== 'normal' || !valorPositivo(p.valorCentavos).ok || !idValido(p.categoriaId) || !texto(p.descricao, 120) || !texto(p.motivo, 1000) || !umDe(p.tipoJurosOuEncargo, ['juros', 'encargo']) || !dataCalendario(p.dataEfeito).ok || (p.dataEfeito as string) > ctx.hoje) return erro()
  const exigivel = somarCentavos([c.exigivelCentavos, p.valorCentavos])
  if (!exigivel.ok) return exigivel
  const next = atualizar(c, 'registrarEncargo', p.operationKey as string, ctx, { exigivelCentavos: exigivel.valor })
  const capacidade = criarCapacidadeItem(p.valorCentavos, p.categoriaId)
  if (!capacidade.ok) return capacidade
  return next.ok ? sucesso({ controle: next.valor, item: { id: next.valor.ultimoEventoId, uid: c.uid, faturaId: c.faturaId, tipo: 'encargo' as const, tipoJurosOuEncargo: p.tipoJurosOuEncargo, valorCentavos: p.valorCentavos as number, categoriaId: p.categoriaId, descricao: p.descricao, motivo: p.motivo, dataEfeito: p.dataEfeito as string, capacidade: capacidade.valor } }) : next
}
