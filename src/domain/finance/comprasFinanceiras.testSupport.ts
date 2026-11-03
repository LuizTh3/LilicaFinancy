import type { Cartao } from './contracts/cartoes'
import type { FaturaFinanceira } from './faturaFinanceira'
import { calendarioBaseFatura } from './invoiceCalendar'
import { inicializarControleFatura } from './liquidacoesFaturas'
import { prepararCriacaoCompraFinanceira } from './comprasFinanceiras'
import { ler } from './testing.testSupport'

export const cartaoCompraFinanceiraTeste: Cartao = { uid: 'A', id: 'card', banco: 'Banco', nome: 'Cartão', titularId: 'holder', diaFechamento: 10, diaVencimento: 17, estado: 'ativo', schemaVersion: 1, version: 1, ultimoEventoId: 'criarCartao__prior', createdAt: 1000, updatedAt: 1000 }
export const dadosCompraFinanceiraTeste = { cartaoId: 'card', descricao: 'Compra100', dataCompra: '2026-11-01', categoriaId: 'cat', etiquetaIds: [], valorTotalCentavos: 10000, quantidadeParcelas: 3 }
export const descritorCompraFinanceiraTeste = { contractVersion: 1 as const, tipo: 'criarCompra' as const, operationKey: 'intent', compraId: 'buy', expectedVersion: 0 as const }
export function faturaCompraFinanceiraTeste(mes: string): FaturaFinanceira {
  const eventoId = 'confirmarFatura__prior'
  return { ...ler(calendarioBaseFatura(mes, 10, 17)), uid: 'A', id: `card__${mes}`, cartaoId: 'card', schemaVersion: 1, versaoConteudo: 4, version: 1, ultimoEventoId: eventoId, createdAt: 1000, updatedAt: 1000, conteudo: ler(inicializarControleFatura({ uid: 'A', faturaId: `card__${mes}`, cartaoId: 'card', competencia: mes, exigivelCentavos: 0, eventoId, instante: 1000 })) }
}
export const previaCompraFinanceiraTeste = () => ler(prepararCriacaoCompraFinanceira(dadosCompraFinanceiraTeste, { uid: 'A', hoje: '2026-11-01', cartao: cartaoCompraFinanceiraTeste, faturas: ['2026-11', '2026-12', '2027-01'].map(faturaCompraFinanceiraTeste), primeiroUsoCategoria: false }, { id: 'buy', eventoId: 'criarCompra__intent', instante: 2000 }))
