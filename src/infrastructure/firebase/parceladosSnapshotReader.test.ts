import { expect, it, vi } from 'vitest'
import { createParceladosSnapshotReader } from './parceladosSnapshotReader'
import { createExternosSnapshotReader } from './externosSnapshotReader'
const time = '2026-10-21T12:00:00.123456Z'
function setup() {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify([{ readTime: time }])))
  const contexto = { projectId: 'fixture-project', uid: 'A', generation: 1, atual: () => true, token: async () => 'local-fixture', agora: () => Date.parse(time) + 1000, fetcher }
  return { reader: createParceladosSnapshotReader(contexto), externo: createExternosSnapshotReader(contexto), fetcher }
}
it('consulta séries por competência indexada e ID com readTime externo, sem varrer catálogo', async () => {
  const f = setup(), t = await f.reader.iniciar()
  await f.reader.consultar(t, { colecao: 'seriesParceladas', competencia: '2026-11', tipo: 'emprestimo', pageSize: 4, aposId: 'serie' })
  const b = JSON.parse(String(f.fetcher.mock.calls[1][1]?.body))
  expect(b.readTime).toBe(time)
  expect(b.structuredQuery.limit).toBe(4)
  expect(b.structuredQuery.where.compositeFilter.filters).toContainEqual({ fieldFilter: { field: { fieldPath: 'competencias' }, op: 'ARRAY_CONTAINS', value: { stringValue: '2026-11' } } })
  expect(b.structuredQuery.startAt.values[0].referenceValue).toContain('/users/A/seriesParceladas/serie')
})
it('consultas de história e caixa são fechadas e caixa separa pagamento/reversão', async () => {
  const f = setup(), t = await f.reader.iniciar()
  await f.reader.consultar(t, { colecao: 'operacoesParceladas', serieId: 'serie', pageSize: 10 })
  await f.reader.consultar(t, { colecao: 'operacoesParceladas', fluxo: 'reversaoPagamento', inicio: '2026-11-01', fim: '2026-12-01', pageSize: 10 })
  const body = JSON.parse(String(f.fetcher.mock.calls[2][1]?.body))
  expect(body.structuredQuery.where.compositeFilter.filters).toContainEqual({ fieldFilter: { field: { fieldPath: 'fato.tipo' }, op: 'EQUAL', value: { stringValue: 'reversaoPagamento' } } })
  await expect(f.reader.consultar(t, { colecao: 'seriesParceladas', competencia: '2026-11', pageSize: 51 })).rejects.toMatchObject({ code: 'limiteOperacional' })
})
it('a porta005 permanece restrita e novas referências não permitem caminhos livres', async () => {
  const f = setup(), t = await f.reader.iniciar()
  await expect(f.externo.obter(t, [{ colecao: 'seriesParceladas', id: 'serie' }] as never)).rejects.toMatchObject({ code: 'referenciaInvalida' })
  await expect(f.reader.obter(t, [{ colecao: 'seriesParceladas', id: 'B/serie' }])).rejects.toMatchObject({ code: 'referenciaInvalida' })
  await expect(f.reader.consultar(t, { colecao: 'lancamentosExternos', natureza: 'receita', competencia: '2026-11', pageSize: 1 } as never)).rejects.toMatchObject({ code: 'referenciaInvalida' })
})
