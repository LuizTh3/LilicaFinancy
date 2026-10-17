import { expect, it } from 'vitest'
import { sugerirPrimeiraFatura } from './invoiceCalendar'
import { congelar, ler } from './testing.testSupport'

it('compra no fechamento segue para o próximo ciclo', () => {
  const card = congelar({ diaFechamento: 10, diaVencimento: 17 })
  expect(ler(sugerirPrimeiraFatura('2026-10-09', card)).competencia).toBe('2026-10')
  expect(ler(sugerirPrimeiraFatura('2026-10-10', card)).competencia).toBe('2026-11')
  expect(ler(sugerirPrimeiraFatura('2026-10-11', card)).vencimento).toBe('2026-11-17')
  expect(ler(sugerirPrimeiraFatura('2026-10-24', { diaFechamento: 25, diaVencimento: 5 })).competencia).toBe('2026-11')
})
it('ajusta dias inexistentes e preserva fatura explicitamente confirmada', () => {
  const proposed = ler(sugerirPrimeiraFatura('2027-02-27', { diaFechamento: 31, diaVencimento: 31 }))
  expect(proposed.fechamento).toBe('2027-02-28')
  expect(proposed.vencimento).toBe('2027-03-31')
  const explicit = congelar({ competencia: '2026-12', fechamento: '2026-11-25', vencimento: '2026-12-05' })
  expect(ler(sugerirPrimeiraFatura('2026-10-09', { diaFechamento: 20, diaVencimento: 22 }, explicit))).toEqual({ ...explicit, origem: 'confirmada' })
  expect(sugerirPrimeiraFatura('2026-10-09', { diaFechamento: 0, diaVencimento: 22 }).ok).toBe(false)
  expect(sugerirPrimeiraFatura('2026-10-09', {}, { ...explicit, vencimento: '2026-11-05' }).ok).toBe(false)
})
