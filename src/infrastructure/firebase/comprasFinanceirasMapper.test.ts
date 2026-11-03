import { expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { decodeCompraFinanceira } from './comprasFinanceirasMapper'
import { criarCompraFinita } from '../../domain/finance/comprasAggregate'
import { calendarioBaseFatura } from '../../domain/finance/invoiceCalendar'
import { inicializarControleFatura } from '../../domain/finance/liquidacoesFaturas'
import { prepararCriacaoCompraFinanceira } from '../../domain/finance/comprasFinanceiras'
import type { Cartao } from '../../domain/finance/contracts/cartoes'
import { ler } from '../../domain/finance/testing.testSupport'

const card: Cartao = { uid: 'A', id: 'card', banco: 'Banco', nome: 'Cartão', titularId: 'holder', diaFechamento: 10, diaVencimento: 17, estado: 'ativo', schemaVersion: 1, version: 1, ultimoEventoId: 'criarCartao__one', createdAt: 1, updatedAt: 1 }
const dados = { cartaoId: 'card', descricao: 'Compra', dataCompra: '2026-11-01', categoriaId: 'cat', etiquetaIds: [], valorTotalCentavos: 10000, quantidadeParcelas: 1 }
function persisted() {
  const calendario = ler(calendarioBaseFatura('2026-11', 10, 17))
  const fatura = { ...calendario, id: 'card__2026-11', uid: 'A', cartaoId: 'card', schemaVersion: 1, versaoConteudo: 4, version: 1, ultimoEventoId: 'confirmarFatura__i', createdAt: 1, updatedAt: 1, conteudo: ler(inicializarControleFatura({ uid: 'A', faturaId: 'card__2026-11', cartaoId: 'card', competencia: '2026-11', exigivelCentavos: 0, eventoId: 'criarCompra__prior', origemId: 'prior', instante: 1 })) }
  const plano = ler(prepararCriacaoCompraFinanceira(dados, { uid: 'A', hoje: '2026-11-01', cartao: card, faturas: [fatura], primeiroUsoCategoria: false }, { id: 'buy', eventoId: 'criarCompra__intent', instante: 1000 }))
  const { uid: _, id: __, ...raw } = plano.compra
  return { ...raw, createdAt: Timestamp.fromMillis(1000), updatedAt: Timestamp.fromMillis(1000) }
}
it('preserva o comando corrente finito sem perder capacidade nem identidade', () => {
  const c = decodeCompraFinanceira('A', 'buy', persisted())
  expect(c).toMatchObject({ id: 'buy', uid: 'A', comandoAtual: { eventoId: 'criarCompra__intent', antes: null }, parcelas: { p01: { capacidade: { valorOriginalCentavos: 10000 } } } })
})
it('recusa agregado preliminar sem comando, payload com UID, timestamp livre e imagem divergente', () => {
  const raw = persisted(), { comandoAtual: _, ...unsealed } = raw
  for (const data of [unsealed, { ...raw, uid: 'B' }, { ...raw, createdAt: 1000 }, { ...raw, comandoAtual: { ...raw.comandoAtual, eventoId: 'criarCompra__old' } }]) expect(() => decodeCompraFinanceira('A', 'buy', data)).toThrow()
  // The earlier pure constructor remains a preview model; it is not an authoritative financial record.
  expect(criarCompraFinita(dados, { uid: 'A', hoje: '2026-11-01', cartao: card, faturas: [], controles: [] }, { id: 'buy', eventoId: 'criarCompra__i', instante: 1000 }).ok).toBe(true)
})
