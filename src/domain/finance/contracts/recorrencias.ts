import type { CalendarioFaturaV2 } from '../invoiceCalendar'

// Read models consumed by the pure projector. Persisted S/V/O also carry
// technical metadata and commands, which belong to the persistence decoder.
export type NaturezaRecorrente = 'receitaExterna' | 'despesaExterna' | 'assinaturaCartao'
export type SerieRecorrente = Readonly<{ id: string; uid: string; version: number; natureza: NaturezaRecorrente; inicio: string; terminoOriginal?: string; estado: 'ativa' | 'encerrada'; encerradaDesdeMes?: string }>
export type RevisaoRecorrente = Readonly<{
  id: string; uid: string; serieId: string; version: number; inicioMes: string; fimExclusivo?: string
  descricao: string; categoriaId: string; valorCentavos: number; estimado: boolean; diaAncora: number
  titularId?: string; contaPrevistaId?: string; cartaoId?: string; etiquetaIds?: readonly string[]; observacao?: string
}>
type FinanceiroBase = Readonly<{ descricao: string; categoriaId: string; valorCentavos: number; estimado: boolean; etiquetaIds?: readonly string[]; observacao?: string }>
export type FinanceiroExternoRecorrente = FinanceiroBase & Readonly<{ competenciaPlanejamento: string; liquidadoLiquidoCentavos: number; jaLiquidada: boolean; dataPrevista?: string; vencimento?: string; dataConsumo?: string; titularId?: string; contaPrevistaId?: string }>
export type FinanceiroCartaoRecorrente = FinanceiroBase & Readonly<{ dataCompra: string; cartaoId: string; faturaId: string; competenciaFatura: string; inicioCiclo: string; fechamentoCiclo: string }>
export type FinanceiroRecorrente = FinanceiroExternoRecorrente | FinanceiroCartaoRecorrente
export type CapacidadeItemRecorrente = Readonly<{ schemaVersion: 1; valorOriginalCentavos: number; correcaoAcrescimosCentavos: number; correcaoReducoesCentavos: number; devolvidoCentavos: number; categoriaEfetivaId: string }>
export type OcorrenciaRecorrente = Readonly<{
  id: string; uid: string; version: number; serieId: string; mesReferencia: string; natureza: NaturezaRecorrente
  revisaoId: string; revisaoVersion: number; estado: 'persistida' | 'pulada' | 'cancelada'; excecaoIndividual: boolean
  financeiro?: FinanceiroRecorrente; capacidadeItem?: CapacidadeItemRecorrente; motivoSupressao?: string
}>
export type LinhaProjecaoRecorrente = Omit<OcorrenciaRecorrente, 'estado'> & Readonly<{ estado: OcorrenciaRecorrente['estado'] | 'virtual'; fonte: 'persistida' | 'virtual' }>
export type DestinoAssinatura = Readonly<{ uid: string; serieId: string; mesReferencia: string; cartaoId: string; calendario: CalendarioFaturaV2; escolha: 'sugerida' | 'explicita' }>
export type ContextoProjecaoRecorrente = Readonly<{ uid: string; inicioMes: string; fimMes: string; base: 'planejamento' | 'consumo'; seriesCompletas: boolean; persistidasCompletas: boolean; intervaloCobranca?: Readonly<{ inicio: string; fimExclusivo: string }> }>
export type EntradaProjecaoRecorrente = Readonly<{ contexto: ContextoProjecaoRecorrente; series: readonly SerieRecorrente[]; revisoes: readonly RevisaoRecorrente[]; persistidas: readonly OcorrenciaRecorrente[]; ausenciasConfirmadas: readonly string[]; destinosCartao: readonly DestinoAssinatura[] }>
export type PendenciaProjecaoRecorrente = Readonly<{ serieId?: string; mesReferencia?: string; motivo: 'descobertaIncompleta' | 'persistidasIncompletas' | 'revisaoAusente' | 'slotNaoReconciliado' | 'destinoCartaoNaoResolvido' | 'intervaloCobrancaNaoResolvido' }>
export type ProjecaoRecorrente = Readonly<{ linhas: readonly LinhaProjecaoRecorrente[]; pendencias: readonly PendenciaProjecaoRecorrente[]; completo: boolean }>
