import { expect, it, vi } from 'vitest'
import { createPainelParceladosSource } from './painelParceladosSource'
import { serieParceladaTeste } from '../../domain/finance/parcelados.testSupport'
import { encodeSerieParcelada } from './parceladosMapper'
import { createOrcamentoRodada } from './painelQueries'
import type { createFinanceiroSnapshotReader } from './financeiroSnapshotReader'
const time = '2026-10-21T12:00:00Z'
const snapshot = { uid: 'A', generation: 1, readTime: time, expiresAt: Date.parse(time) + 50 * 60000, contractRevision: 1 as const, hojeFinanceiro: '2026-10-21' }
const consulta = { contractVersion: 1 as const, base: 'planejamento' as const, inicio: '2026-11', fim: '2026-11', modo: 'mensal' as const, filtros: {} }
it('expande no máximo quatro agregados por leitura, preserva orçamento/snapshot e não soma capital', async () => {
  const serie = serieParceladaTeste(), consultar = vi.fn<ReturnType<typeof createFinanceiroSnapshotReader>['consultar']>(async (_t, q, budget) => budget!.executar(q.pageSize, async () => ({ documentos: 4, valor: ['a', 'b', 'c', 'd'].map(id => ({ colecao: 'seriesParceladas' as const, id, dados: encodeSerieParcelada({ ...serie, id }) })) })))
  const source = createPainelParceladosSource({ consultar, invalidarSessao: () => {} } as unknown as ReturnType<typeof createFinanceiroSnapshotReader>, 'A')
  const orcamento = createOrcamentoRodada(), page = await source.paginar({ consulta, snapshot, orcamento })
  expect(page.contribuicoes).toHaveLength(4)
  expect(page.contribuicoes.every(c => c.autoridade === 'parcelaExterna' && c.valorCentavos === 20000)).toBe(true)
  expect(page.completo).toBe(false)
  expect(orcamento.documentos).toBe(4)
  expect(consultar.mock.calls[0][0]).toEqual(snapshot)
  expect(consultar.mock.calls[0][1]).toMatchObject({ competencia: '2026-11', pageSize: 4 })
  expect(page.proxima).toContain('d')
})
it('rejeita índice do recorte falso, posição forjada e UID de outro contexto', async () => {
  const serie = serieParceladaTeste(), consultar = vi.fn(async () => [{ colecao: 'seriesParceladas', id: 'serie', dados: encodeSerieParcelada(serie) }])
  const source = createPainelParceladosSource({ consultar, invalidarSessao: () => {} } as unknown as ReturnType<typeof createFinanceiroSnapshotReader>, 'A')
  await expect(source.paginar({ consulta: { ...consulta, inicio: '2025-11', fim: '2025-11' }, snapshot, orcamento: createOrcamentoRodada() })).rejects.toBeDefined()
  await expect(source.paginar({ consulta, snapshot: { ...snapshot, uid: 'B' }, orcamento: createOrcamentoRodada() })).rejects.toBeDefined()
  await expect(source.paginar({ consulta, snapshot, posicao: '{"aposId":"bad/id"}', orcamento: createOrcamentoRodada() })).rejects.toBeDefined()
})
