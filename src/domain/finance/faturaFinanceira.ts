import type { Fatura, ReciboFatura } from './contracts/faturas'
import type { Cartao } from './contracts/cartoes'
import type { ControleFatura } from './contracts/liquidacoesFaturas'
import { camposPermitidos, falha, registro, sucesso, versaoValida } from './errors'
import type { Resultado } from './errors'
import { inicializarControleFatura, validarControleFatura } from './liquidacoesFaturas'
import { validarCalendarioFatura } from './invoiceCalendar'
import { dadosFatura, eventoFaturaId, identidadeFaturaValida, planejarConfirmacaoFatura, validarComandoFatura } from './faturas'
import { idCartaoValido } from './cartoes'
import { instanteTecnicoValido } from './technicalTime'

export type FaturaFinanceira = Omit<Fatura, 'versaoConteudo'> & Readonly<{ versaoConteudo: 4; conteudo: ControleFatura }>
/** Pure explicit confirmation. The future transaction must prove document absence and reciprocal receipt. */
export function prepararFaturaFinanceiraNova(input: unknown, cartao: Cartao, vizinhas: readonly Fatura[], ctx: { uid: string; instante: number; ausenciaConfirmada: boolean }): Resultado<{ fatura: FaturaFinanceira; recibo: ReciboFatura }> {
  if (!ctx.uid || cartao.uid !== ctx.uid || ctx.ausenciaConfirmada !== true || !instanteTecnicoValido(ctx.instante)) return falha('integridadeIndeterminada', 'Confirme a ausência da fatura antes de criar seu controle. Legado não pode ser inicializado por este comando.', { recuperacao: 'reler' })
  const valid = validarComandoFatura(input)
  if (!valid.ok) return valid
  const c = valid.valor
  if (c.tipo !== 'confirmarFatura') return falha('valorInvalido', 'Informe uma confirmação explícita de fatura nova.')
  const plano = planejarConfirmacaoFatura(c, cartao, undefined, vizinhas)
  if (!plano.ok) return plano
  const eventoId = eventoFaturaId(c), d = plano.valor.dados
  const controle = inicializarControleFatura({ uid: ctx.uid, faturaId: c.alvoId, cartaoId: d.cartaoId, competencia: d.competencia, exigivelCentavos: 0, eventoId, instante: ctx.instante })
  if (!controle.ok) return controle
  const fatura = validarFaturaFinanceira({ ...d, id: c.alvoId, uid: ctx.uid, schemaVersion: 1, versaoConteudo: 4, version: 1, ultimoEventoId: eventoId, createdAt: ctx.instante, updatedAt: ctx.instante, conteudo: controle.valor })
  return fatura.ok ? sucesso({ fatura: fatura.valor, recibo: { schemaVersion: 1, contractVersion: 1, operationKey: c.operationKey, tipo: c.tipo, alvoId: c.alvoId, expectedVersion: 0, resultVersion: 1, comando: c, resultado: dadosFatura(d), createdAt: ctx.instante } }) : fatura
}
export function validarFaturaFinanceira(input: unknown): Resultado<FaturaFinanceira> {
  const erro = () => falha('esquemaIncompativel', 'Fatura financeira ausente ou incompatível.', { recuperacao: 'reler' })
  const campos = ['uid', 'id', 'cartaoId', 'competencia', 'inicio', 'fechamento', 'vencimento', 'calendarioOrigem', 'schemaVersion', 'versaoConteudo', 'version', 'ultimoEventoId', 'createdAt', 'updatedAt', 'conteudo']
  if (!registro(input) || !camposPermitidos(input, campos) || campos.some(k => !(k in input)) || typeof input.uid !== 'string' || !input.uid || !idCartaoValido(input.cartaoId) || !identidadeFaturaValida(input.id) || input.id !== `${input.cartaoId}__${input.competencia}` || input.schemaVersion !== 1 || input.versaoConteudo !== 4 || !versaoValida(input.version) || typeof input.ultimoEventoId !== 'string' || !/^(confirmarFatura|ajustarVencimento)__[A-Za-z0-9-]{1,64}$/.test(input.ultimoEventoId) || !instanteTecnicoValido(input.createdAt) || !instanteTecnicoValido(input.updatedAt) || input.updatedAt < input.createdAt) return erro()
  const calendario = validarCalendarioFatura(input), controle = validarControleFatura(input.conteudo)
  if (!calendario.ok || !calendario.valor.calendarioOrigem || !controle.ok || controle.valor.uid !== input.uid || controle.valor.faturaId !== input.id || controle.valor.cartaoId !== input.cartaoId || controle.valor.competencia !== input.competencia || controle.valor.createdAt < (input.createdAt as number)) return erro()
  return sucesso(Object.freeze({ ...calendario.valor, uid: input.uid, id: input.id, cartaoId: input.cartaoId, schemaVersion: 1, versaoConteudo: 4, version: input.version, ultimoEventoId: input.ultimoEventoId, createdAt: input.createdAt as number, updatedAt: input.updatedAt as number, conteudo: Object.freeze(controle.valor) }) as FaturaFinanceira)
}
/** Applies a previously validated financial proposal without rewriting calendar metadata. */
export function aplicarControleFinanceiroFatura(fatura: FaturaFinanceira, proposta: unknown): Resultado<FaturaFinanceira> {
  const envelope = validarFaturaFinanceira(fatura)
  if (!envelope.ok) return envelope
  const antes = validarControleFatura(fatura.conteudo), depois = validarControleFatura(proposta)
  if (!antes.ok) return antes
  if (!depois.ok) return depois
  const a = antes.valor, d = depois.valor
  if (fatura.versaoConteudo !== 4 || a.uid !== fatura.uid || a.faturaId !== fatura.id || a.cartaoId !== fatura.cartaoId || a.competencia !== fatura.competencia || d.uid !== a.uid || d.faturaId !== a.faturaId || d.cartaoId !== a.cartaoId || d.competencia !== a.competencia || d.version !== a.version + 1 || d.createdAt !== a.createdAt || d.updatedAt < a.updatedAt || a.possuiHistoricoPagamento && !d.possuiHistoricoPagamento) return falha('integridadeIndeterminada', 'A transição financeira não corresponde à fatura e à versão conferidas.', { recuperacao: 'reler' })
  return sucesso(Object.freeze({ ...fatura, conteudo: Object.freeze(d) }))
}
