import { expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { decodeSerieParcelada, encodeSerieParcelada, mapearCompromissosParcelados } from './parceladosMapper'
import { serieParceladaTeste } from '../../domain/finance/parcelados.testSupport'

it('faz roundtrip do mapa finito com timestamps reais e mantém original ausente', () => {
  const s = serieParceladaTeste(), raw = encodeSerieParcelada(s)
  expect(raw.createdAt).toBeInstanceOf(Timestamp)
  expect(decodeSerieParcelada('A', 'serie', raw)).toEqual(s)
  expect('valorOriginalCentavos' in raw).toBe(false)
  expect('uid' in raw).toBe(false)
  expect(mapearCompromissosParcelados(s).map(p => p.id)).toEqual(['serie__p05', 'serie__p06', 'serie__p07', 'serie__p08', 'serie__p09', 'serie__p10'])
})
it('nega timestamps livres, UID/ID no payload, campos extras e índices adulterados', () => {
  const raw = encodeSerieParcelada(serieParceladaTeste())
  for (const patch of [{ createdAt: 1000 }, { uid: 'B' }, { id: 'other' }, { competencias: [] }, { schemaVersion: 2 }, { parcelas: {} }, { pagamentos: [] }]) expect(() => decodeSerieParcelada('A', 'serie', { ...raw, ...patch })).toThrow()
})
it('não atribui quitação à parcela anterior ausente e não soma capital original', () => {
  const s = { ...serieParceladaTeste(), valorOriginalCentavos: 900000 as ReturnType<typeof serieParceladaTeste>['valorOriginalCentavos'] }
  const rows = mapearCompromissosParcelados(s)
  expect(rows).toHaveLength(6)
  expect(rows.reduce((s, p) => s + p.valorCentavos, 0)).toBe(120000)
  expect(rows.every(row => row.tipo === 'parcelaExterna')).toBe(true)
})
it('aceita a precisão submilissegundo do timestamp servidor sem arredondar dinheiro', () => {
  const raw = encodeSerieParcelada(serieParceladaTeste()), stamp = new Timestamp(1, 123456000)
  const s = decodeSerieParcelada('A', 'serie', { ...raw, createdAt: stamp, updatedAt: stamp })
  expect(s.createdAt).toBe(stamp.toMillis())
  expect(s.parcelas.p05.valorCentavos).toBe(20000)
})
