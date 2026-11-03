import { expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { decodeCompra, obterParcelaCompra } from './comprasMapper'

const persisted = () => ({ schemaVersion: 2, version: 1, cronogramaRevision: 1, cartaoId: 'card', descricao: 'Compra', dataCompra: '2026-12-01', categoriaId: 'cat', etiquetaIds: [], valorTotalCentavos: 10000, quantidadeParcelas: 1, primeiraCompetenciaFatura: '2026-12', primeiraFaturaEscolha: 'explicita', estadoObrigacao: 'ativa', ultimoEventoId: 'criarCompra__intent', createdAt: Timestamp.fromMillis(1000), updatedAt: Timestamp.fromMillis(1000), competenciasFaturas: ['2026-12'], parcelas: { p01: { numero: 1, quantidadeOriginal: 1, valorCentavos: 10000, competenciaFatura: '2026-12', faturaId: 'card__2026-12', capacidade: { schemaVersion: 1, valorOriginalCentavos: 10000, correcaoAcrescimosCentavos: 0, correcaoReducoesCentavos: 0, devolvidoCentavos: 0, categoriaEfetivaId: 'cat' } } } })
it('decodifica schema finito sem documentos-filho e resolve parcela pela origem', () => {
  const c = decodeCompra('A', 'buy', persisted())
  expect(c).toMatchObject({ uid: 'A', id: 'buy', schemaVersion: 2, createdAt: 1000 })
  expect(obterParcelaCompra('A', c, 'buy__r1__n1')).toMatchObject({ id: 'buy__r1__n1', valorCentavos: 10000 })
})
it('rejeita UID alheio, revisão antiga e ordinal extra sem fallback financeiro', () => {
  const c = decodeCompra('A', 'buy', persisted())
  for (const [uid, id] of [['B', 'buy__r1__n1'], ['A', 'buy__r2__n1'], ['A', 'buy__r1__n2']]) expect(() => obterParcelaCompra(uid, c, id)).toThrow()
})
it('recusa timestamps livres, schema legado, campos extras e índices incompletos', () => {
  for (const patch of [{ schemaVersion: 1 }, { createdAt: 1000 }, { uid: 'B' }, { id: 'other' }, { competenciasFaturas: [] }, { liquidadoCentavos: 0 }, { updatedAt: Timestamp.fromMillis(999) }]) expect(() => decodeCompra('A', 'buy', { ...persisted(), ...patch })).toThrow()
})
it('não oferece parcela exigível de compra cancelada e conserva snapshot', () => {
  const p = { ...persisted(), version: 2, estadoObrigacao: 'cancelada', updatedAt: Timestamp.fromMillis(2000), canceledAt: Timestamp.fromMillis(2000), cancelamentoMotivo: 'Cancelada', ultimoEventoId: 'cancelarCompra__cancel' }
  const c = decodeCompra('A', 'buy', p)
  expect(c.valorTotalCentavos).toBe(10000)
  expect(() => obterParcelaCompra('A', c, 'buy__r1__n1')).toThrow()
})
it('não rejeita timestamps reais com precisão menor que um milissegundo', () => {
  const stamp = new Timestamp(1, 123456000)
  expect(decodeCompra('A', 'buy', { ...persisted(), createdAt: stamp, updatedAt: stamp }).createdAt).toBe(stamp.toMillis())
})
