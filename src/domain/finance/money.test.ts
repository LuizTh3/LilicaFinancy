import { expect, it } from 'vitest'
import { aplicarCreditoObrigacao, centavos, compararCentavos, diferencaMonetaria, distribuirParcelas, formatarBRL, interpretarBRL, multiplicarCentavos, somarCentavos, subtrairCentavos, valorPositivo } from './money'
import { ler } from './testing.testSupport'

const MAX = Number.MAX_SAFE_INTEGER
it.each([['R$ 1.234,56', 123456], ['R$\u00a00,01', 1], ['1234', 123400], ['1.234', 123400], ['1234,5', 123450], [' 0,00 ', 0]])('interpreta %s', (input, expected) => {
  expect(ler(interpretarBRL(input))).toBe(expected)
})
it.each(['', 'R$', '1.23', '1,234', '1,234.56', '1e3', '-0', '-5,00', '+1', '1 234', 'R$  1,00', '1,', 'Infinity', '１２,００'])('rejeita texto %j', input => {
  expect(interpretarBRL(input).ok).toBe(false)
})
it('valida números em execução, positivo e todos os arredores do máximo', () => {
  for (const input of [undefined, null, {}, true, '1', 1.5, -1, NaN, Infinity, MAX + 1]) expect(centavos(input).ok).toBe(false)
  expect(ler(centavos(0))).toBe(0)
  expect(Object.is(ler(centavos(-0)), -0)).toBe(false)
  expect(valorPositivo(0).ok).toBe(false)
  for (const input of [0, 1, 99, 100, 101, MAX - 1, MAX]) expect(ler(interpretarBRL(ler(formatarBRL(input))))).toBe(input)
  expect(ler(formatarBRL(MAX))).toBe('R$ 90.071.992.547.409,91')
  expect(interpretarBRL('90.071.992.547.409,92').ok).toBe(false)
})
it('opera com limites exatos, sem compensar overflow intermediário', () => {
  expect(ler(somarCentavos([]))).toBe(0)
  expect(ler(somarCentavos([MAX - 1, 1]))).toBe(MAX)
  expect(somarCentavos([MAX, 1]).ok).toBe(false)
  expect(ler(subtrairCentavos(100, 100))).toBe(0)
  expect(subtrairCentavos(1, 2).ok).toBe(false)
  expect(multiplicarCentavos(MAX, 2).ok).toBe(false)
  expect(multiplicarCentavos(1, 1.5).ok).toBe(false)
  expect(ler(multiplicarCentavos(MAX, 0))).toBe(0)
  expect(ler(compararCentavos(MAX, MAX - 1))).toBe(1)
  expect(ler(diferencaMonetaria(0, 100))).toEqual({ natureza: 'deficit', magnitudeCentavos: 100 })
  expect(ler(diferencaMonetaria(100, 100))).toEqual({ natureza: 'equilibrio', magnitudeCentavos: 0 })
})
it('distribui cada quantidade e fronteira usando soma BigInt independente', () => {
  expect(ler(distribuirParcelas(10000, 3))).toEqual([3334, 3333, 3333])
  expect(ler(distribuirParcelas(10001, 3))).toEqual([3334, 3334, 3333])
  for (let n = 1; n <= 12; n++) {
    for (const total of [n, n + 1, 10000, MAX]) {
      const result = ler(distribuirParcelas(total, n))
      expect(result.reduce((sum, item) => sum + BigInt(item), 0n)).toBe(BigInt(total))
      expect(result).toHaveLength(n)
      expect(result.every((value, i) => value > 0 && (i === 0 || result[i - 1] >= value))).toBe(true)
      expect(result[0] - result[n - 1]).toBeLessThanOrEqual(1)
    }
    expect(distribuirParcelas(n - 1, n).ok).toBe(false)
  }
  for (const n of [0, 13, 1.5, '3', NaN]) expect(distribuirParcelas(100, n).ok).toBe(false)
})
it('a operação aritmética não cria caixa', () => {
  expect(ler(aplicarCreditoObrigacao(100, { tipo: 'creditoObrigacao', valorCentavos: 10, origemId: 'origem', motivo: 'Correção', dataEfeito: '2026-10-17' }))).toBe(90)
})
