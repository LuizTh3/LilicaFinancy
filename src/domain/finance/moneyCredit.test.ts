import { expect, it } from 'vitest'
import { aplicarCreditoObrigacao } from './money'
import { congelar, ler } from './testing.testSupport'

const credit = congelar({ tipo: 'creditoObrigacao', valorCentavos: 500, origemId: 'origem', motivo: 'Crédito informado', dataEfeito: '2026-10-17' })
it('reduz apenas a magnitude do saldo com operação explicitamente tipada', () => {
  expect(ler(aplicarCreditoObrigacao(1000, credit))).toBe(500)
  expect(credit.valorCentavos).toBe(500)
})
it('rejeita redução sem origem, motivo, data real ou discriminante', () => {
  for (const invalid of [-500, '-5,00', { ...credit, valorCentavos: -500 }, { ...credit, tipo: 'despesa' }, { ...credit, origemId: '' }, { ...credit, motivo: '' }, { ...credit, dataEfeito: '2026-02-29' }, { ...credit, extra: true }]) {
    expect(aplicarCreditoObrigacao(1000, invalid).ok).toBe(false)
  }
  expect(aplicarCreditoObrigacao(499, credit).ok).toBe(false)
})
