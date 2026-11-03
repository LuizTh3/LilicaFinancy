import { expect, it } from 'vitest'
import { normalizarIntencaoCriacaoCompra } from '../comprasFinanceirasCommands'
import { descritorCompraFinanceiraTeste, previaCompraFinanceiraTeste } from '../comprasFinanceiras.testSupport'
import { ler } from '../testing.testSupport'

it('conferência inclui proprietário, identidade e transição completa, sem depender do instante de envio', () => {
  const compra = previaCompraFinanceiraTeste().compra
  const a = ler(normalizarIntencaoCriacaoCompra({ descritor: descritorCompraFinanceiraTeste, compra }))
  const b = ler(normalizarIntencaoCriacaoCompra({ descritor: descritorCompraFinanceiraTeste, compra: { ...compra, createdAt: 3000, updatedAt: 3000 } }))
  expect(a.conferencia).toBe(b.conferencia)
  expect(a.conferencia).toContain('"uid":"A"')
  expect(a.compra.comandoAtual.faturas['card__2026-11'].deltaCentavos).toBe(3334)
})
it('recusa descritor divergente, chave livre, versão ou corpo adulterado e campos extras', () => {
  const compra = previaCompraFinanceiraTeste().compra, descritor = descritorCompraFinanceiraTeste
  for (const d of [{ ...descritor, compraId: 'other' }, { ...descritor, operationKey: 'other' }, { ...descritor, expectedVersion: 1 }, { ...descritor, operationKey: '../escape' }]) expect(normalizarIntencaoCriacaoCompra({ descritor: d, compra }).ok).toBe(false)
  expect(normalizarIntencaoCriacaoCompra({ descritor, compra: { ...compra, descricao: 'Outra' } }).ok).toBe(false)
  expect(normalizarIntencaoCriacaoCompra({ descritor, compra, perfil: 'validado' }).ok).toBe(false)
})
