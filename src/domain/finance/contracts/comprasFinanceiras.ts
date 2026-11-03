import type { CompraFinanceira, TransicaoCriacaoCompra } from '../comprasFinanceiras'
import type { Resultado } from '../errors'

export type DescritorCompraFinanceira = Readonly<{ contractVersion: 1; tipo: 'criarCompra'; operationKey: string; compraId: string; expectedVersion: 0 }>
export type IntencaoCriacaoCompraFinanceira = Readonly<{ descritor: DescritorCompraFinanceira; compra: CompraFinanceira; conferencia: string }>
export type EventoCriacaoCompraFinanceira = Readonly<{ id: string; uid: string; schemaVersion: 1; contractVersion: 1; tipo: 'criarCompra'; operationKey: string; compraId: string; comando: TransicaoCriacaoCompra; createdAt: number }>
export type ConfirmacaoCompraFinanceira = Readonly<{ estado: 'confirmado'; operacaoId: string; compraId: string; resultVersion: 1; faturasVersions: Readonly<Record<string, number>>; verificacao: 'descritor' | 'comandoCompleto' }>
export type ConsultaOperacaoCompraFinanceira = Readonly<{ modo: 'descritor'; descritor: DescritorCompraFinanceira }> | Readonly<{ modo: 'comandoCompleto'; intencao: IntencaoCriacaoCompraFinanceira }>
export interface PortaComprasFinanceiras {
  criarCompra(input: IntencaoCriacaoCompraFinanceira): Promise<Resultado<ConfirmacaoCompraFinanceira>>
  consultarOperacao(input: ConsultaOperacaoCompraFinanceira): Promise<Resultado<ConfirmacaoCompraFinanceira | Readonly<{ estado: 'ausenteConfirmado' | 'indeterminado' }>>>
}
