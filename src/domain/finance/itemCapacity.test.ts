import { expect, it } from 'vitest'
import { criarCapacidadeItem, validarCapacidadeItem, ajustarCapacidadeItem } from './itemCapacity'
import { ler } from './testing.testSupport'

it('corrige e devolve sem perder o valor original ou inferir caixa', () => {
  const original = ler(criarCapacidadeItem(10000, 'cat'))
  const corrigida = ler(ajustarCapacidadeItem(original, { tipo: 'acrescimo', valorCentavos: 1000 }))
  const devolvida = ler(ajustarCapacidadeItem(corrigida.capacidade, { tipo: 'devolucao', valorCentavos: 3000 }))
  expect(devolvida).toMatchObject({ valorCorrigidoCentavos: 11000, valorLiquidoCentavos: 8000, capacidade: { valorOriginalCentavos: 10000, devolvidoCentavos: 3000 } })
  expect(original.correcaoAcrescimosCentavos).toBe(0)
  expect('fato' in devolvida).toBe(false)
})
it('não confunde ausência legada com capacidade zero e rejeita overflow e excesso', () => {
  for (const input of [undefined, {}, { ...ler(criarCapacidadeItem(100, 'cat')), schemaVersion: 2 }, { ...ler(criarCapacidadeItem(100, 'cat')), devolvidoCentavos: 101 }]) expect(validarCapacidadeItem(input).ok).toBe(false)
  const max = ler(criarCapacidadeItem(Number.MAX_SAFE_INTEGER, 'cat'))
  expect(ajustarCapacidadeItem(max, { tipo: 'acrescimo', valorCentavos: 1 }).ok).toBe(false)
  const c = ler(criarCapacidadeItem(100, 'cat'))
  expect(ajustarCapacidadeItem(c, { tipo: 'reducao', valorCentavos: 101 }).ok).toBe(false)
  expect(ajustarCapacidadeItem(c, { tipo: 'devolucao', valorCentavos: 100, contaId: 'account' }).ok).toBe(false)
})
