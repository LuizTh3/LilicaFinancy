import type { Competencia, DataCalendario } from '../calendar'
import type { CalendarioFaturaV2 } from '../invoiceCalendar'
import type { ValorPositivo } from '../money'
import type { Cartao } from './cartoes'
import type { Fatura } from './faturas'
import type { CapacidadeItem } from '../itemCapacity'

// Local planning contracts. A preview is not a persistence capability or a Rules proof.
export type DadosCompra = Readonly<{
  cartaoId: string
  descricao: string
  dataCompra: DataCalendario
  categoriaId: string
  etiquetaIds: readonly string[]
  valorTotalCentavos: ValorPositivo
  quantidadeParcelas: number
  primeiraCompetenciaFatura?: Competencia
}>
export type ControleCompra = Readonly<{ uid: string; faturaId: string; version: number; possuiHistoricoPagamento: boolean }>
export type ContextoPreviaCompra = Readonly<{
  uid: string
  cartao: Cartao
  hoje: string
  faturas: readonly Fatura[]
  controles: readonly ControleCompra[]
}>
export type ParcelaCompraProposta = Readonly<{
  numero: number
  quantidadeOriginal: number
  valorCentavos: ValorPositivo
  competenciaFatura: Competencia
  faturaId: string
}>
export type PreviaCompra = Readonly<{
  dados: DadosCompra
  primeiraFaturaEscolha: 'sugerida' | 'explicita'
  primeiraCompetenciaFatura: Competencia
  parcelas: readonly ParcelaCompraProposta[]
  faturas: readonly CalendarioFaturaV2[]
  conteudoConferencia: string
}>

export type CompraFinita = Omit<DadosCompra, 'primeiraCompetenciaFatura'> & Readonly<{
  id: string
  uid: string
  schemaVersion: 2
  version: number
  cronogramaRevision: number
  primeiraCompetenciaFatura: Competencia
  primeiraFaturaEscolha: 'sugerida' | 'explicita'
  parcelas: Readonly<Record<string, ParcelaCompraProposta & { readonly capacidade: CapacidadeItem }>>
  competenciasFaturas: readonly Competencia[]
  estadoObrigacao: 'ativa' | 'cancelada'
  ultimoEventoId: string
  createdAt: number
  updatedAt: number
  canceledAt?: number
  cancelamentoMotivo?: string
}>
export type ParcelaCompraVigente = ParcelaCompraProposta & Readonly<{ id: string; compraId: string; cronogramaRevision: number }>
