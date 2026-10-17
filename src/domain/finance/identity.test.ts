import { expect, it } from 'vitest'
import { canonicalizarComando, identidadeNatural } from './identity'
import { ler } from './testing.testSupport'

const envelope = { contractVersion: 1, tipo: 'criarCompra', operationKey: 'op1', payload: { origemId: 'compra1', etiquetaIds: ['b', 'a'] }, expectedVersions: [{ id: 'b', version: 2 }, { id: 'a', version: 1 }] }
it('identifica tuplas sem colisão de concatenação e sem nomes pessoais', () => {
  const first = ler(identidadeNatural(['parcela', 'compra', 'a-b', 1]))
  expect(first.startsWith('k1_')).toBe(true)
  expect(first).toMatch(/^[A-Za-z0-9_-]+$/)
  expect(first).not.toBe(ler(identidadeNatural(['parcela', 'obrigacaoExterna', 'a-b', 1])))
  expect(first).toBe(ler(identidadeNatural(['parcela', 'compra', 'a-b', 1])))
  for (const tuple of [['pessoa', 'Nome Pessoal'], ['fatura', 'a/b', '2026-01'], ['fatura', 'a'.repeat(65), '2026-01'], ['parcela', 'compra', 'id', 13]]) expect(identidadeNatural(tuple).ok).toBe(false)
})
it('canonicaliza conjuntos e objetos sem alterar ordem de cronograma', () => {
  const first = ler(canonicalizarComando(envelope))
  expect(first).toBe(ler(canonicalizarComando({ expectedVersions: [...envelope.expectedVersions].reverse(), payload: { etiquetaIds: ['a', 'b'], origemId: 'compra1' }, operationKey: 'op1', tipo: 'criarCompra', contractVersion: 1 })))
  expect(ler(canonicalizarComando({ ...envelope, payload: { parcelas: [1, 2] } }))).not.toBe(ler(canonicalizarComando({ ...envelope, payload: { parcelas: [2, 1] } })))
  for (const invalid of [{ ...envelope, extra: true }, { ...envelope, payload: { extra: true } }, { ...envelope, payload: { origemId: undefined } }, { ...envelope, payload: { valorCentavos: 1n } }, { ...envelope, payload: { valorCentavos: NaN } }, { ...envelope, payload: { valorCentavos: -1 } }, { ...envelope, payload: { etiquetaIds: ['a', 'a'] } }]) expect(canonicalizarComando(invalid).ok).toBe(false)
  expect(canonicalizarComando({ ...envelope, payload: { origemId: 'x'.repeat(20000) } }).ok).toBe(false)
  const cyclic: Record<string, unknown> = {}; cyclic.origem = cyclic
  expect(canonicalizarComando({ ...envelope, payload: cyclic }).ok).toBe(false)
})
