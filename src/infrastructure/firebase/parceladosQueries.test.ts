import { expect, it, vi } from 'vitest'
import { createParceladosQueries } from './parceladosQueries'
import { serieParceladaTeste } from '../../domain/finance/parcelados.testSupport'
import { encodeSerieParcelada } from './parceladosMapper'
import type { createParceladosSnapshotReader } from './parceladosSnapshotReader'
const time = '2026-10-21T12:00:00.123456Z', snapshot = { uid: 'A', generation: 1, readTime: time, expiresAt: Date.parse(time) + 50 * 60000 }
function fixture() {
  const s = serieParceladaTeste(), docs = ['a', 'b', 'c', 'd', 'e'].map(id => ({ colecao: 'seriesParceladas' as const, id, dados: encodeSerieParcelada({ ...s, id }) }))
  const iniciar = vi.fn(async () => snapshot), consultar = vi.fn<ReturnType<typeof createParceladosSnapshotReader>['consultar']>(async (_t, q) => docs.filter(d => !('aposId' in q) || !q.aposId || d.id > q.aposId).slice(0, q.pageSize))
  const reader = { iniciar, consultar, obter: vi.fn(async () => [docs[0]]), invalidarSessao: vi.fn() } as unknown as ReturnType<typeof createParceladosSnapshotReader>
  let atual = true
  const queries = createParceladosQueries(reader, { uid: 'A', generation: 1, atual: () => atual, agora: () => Date.parse(time) + 1000 })
  return { queries, iniciar, consultar, stale: () => { atual = false } }
}
it('expande páginas finitas sem perder cauda e mantém o snapshot ao continuar', async () => {
  const f = fixture(), first = await f.queries.listar({ competencia: '2026-11' })
  expect(first).toMatchObject({ ok: true, valor: { fim: false } })
  if (!first.ok || !first.valor.cursor) throw Error('cursor')
  expect(first.valor.linhas.map(l => l.id)).toEqual(['a__p06', 'b__p06', 'c__p06', 'd__p06'])
  const next = await f.queries.listar({ competencia: '2026-11' }, first.valor.cursor)
  expect(next).toMatchObject({ ok: true, valor: { fim: true } })
  if (!next.ok) throw Error('page')
  expect(next.valor.linhas.map(l => l.id)).toEqual(['e__p06'])
  expect(f.iniciar).toHaveBeenCalledTimes(1)
  expect(f.consultar.mock.calls.every(([t]) => t.readTime === time)).toBe(true)
})
it('filtro local vazio mantém continuação e não faz busca ilimitada para preencher página', async () => {
  const f = fixture(), r = await f.queries.listar({ competencia: '2026-11', titularId: 'outro' })
  expect(r).toMatchObject({ ok: true, valor: { linhas: [], fim: false } })
  expect(f.consultar).toHaveBeenCalledTimes(1)
})
it('nega cursor de outro recorte, outra instância e sessão encerrada', async () => {
  const f = fixture(), r = await f.queries.listar({ competencia: '2026-11' })
  if (!r.ok || !r.valor.cursor) throw Error('cursor')
  expect((await f.queries.listar({ competencia: '2026-12' }, r.valor.cursor)).ok).toBe(false)
  expect((await fixture().queries.listar({ competencia: '2026-11' }, r.valor.cursor)).ok).toBe(false)
  f.stale()
  expect((await f.queries.listar({ competencia: '2026-11' }, r.valor.cursor)).ok).toBe(false)
})
it('tentativa concorrente rejeitada não libera o cursor que ainda está em uso', async () => {
  const f = fixture(), q = { competencia: '2026-11' }, first = await f.queries.listar(q)
  if (!first.ok || !first.valor.cursor) throw Error('cursor')
  let resolver: (v: Awaited<ReturnType<ReturnType<typeof createParceladosSnapshotReader>['consultar']>>) => void = () => {}
  f.consultar.mockImplementationOnce(() => new Promise(resolve => { resolver = resolve }))
  const pending = f.queries.listar(q, first.valor.cursor)
  expect((await f.queries.listar(q, first.valor.cursor)).ok).toBe(false)
  expect((await f.queries.listar(q, first.valor.cursor)).ok).toBe(false)
  expect(f.consultar).toHaveBeenCalledTimes(2)
  resolver([])
  expect((await pending).ok).toBe(true)
})
