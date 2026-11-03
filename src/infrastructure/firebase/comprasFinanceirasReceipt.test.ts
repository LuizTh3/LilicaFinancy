import { expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { decodeEventoCriacaoCompraFinanceira } from './comprasFinanceirasMapper'
import { previaCompraFinanceiraTeste } from '../../domain/finance/comprasFinanceiras.testSupport'

const persisted = () => { const { uid: _, id: __, ...r } = previaCompraFinanceiraTeste().evento; return { ...r, createdAt: new Timestamp(2, 123456000) } }
it('recibo imutável reconstrói a imagem finita e preserva precisão do instante servidor', () => {
  const r = decodeEventoCriacaoCompraFinanceira('A', 'criarCompra__intent', persisted())
  expect(r).toMatchObject({ uid: 'A', id: 'criarCompra__intent', compraId: 'buy', createdAt: 2123.456, comando: { expectedVersion: 0, resultVersion: 1 } })
})
it('recusa ID/operação diferentes, campos injetados e imagem financeira inconsistente', () => {
  const r = persisted()
  for (const patch of [{ uid: 'B' }, { operationKey: 'other' }, { createdAt: 1000 }, { comando: { ...r.comando, depois: { ...r.comando.depois, valorTotalCentavos: 90000 } } }]) expect(() => decodeEventoCriacaoCompraFinanceira('A', 'criarCompra__intent', { ...r, ...patch })).toThrow()
})
