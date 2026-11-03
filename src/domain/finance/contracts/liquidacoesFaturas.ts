import type { CalendarioFatura } from '../invoiceCalendar'

/** Financial content of a fresh invoice aggregate; never inferred from a legacy calendar. */
export type ControleFatura = Readonly<{
  uid: string; faturaId: string; cartaoId: string; competencia: string
  schemaVersion: 2; version: number
  exigivelCentavos: number; liquidadoLiquidoCentavos: number; possuiHistoricoPagamento: boolean
  revisaoEstado: 'normal' | 'reaberta'; revisaoEventoId?: string
  ultimoEventoTipo: string; ultimoEventoId: string; ultimoEventoOrigemId?: string; createdAt: number; updatedAt: number
}>
export type ContextoLiquidacaoFatura = Readonly<{
  uid: string; hoje: string; instante: number; calendario: CalendarioFatura
  conta?: Readonly<{ id: string; uid: string; estadoCadastro: 'ativo' | 'arquivado' }>
}>
