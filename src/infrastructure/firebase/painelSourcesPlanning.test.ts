import { expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { createPainelPlanningSources } from './painelSources'
import { createFinanceiroSnapshotReader } from './financeiroSnapshotReader'
import { createOrcamentoRodada } from './painelQueries'
const t = '2026-10-20T12:00:00Z', snapshot = { uid: 'A', generation: 1, readTime: t, expiresAt: Date.parse(t) + 50 * 60000, contractRevision: 1 as const, hojeFinanceiro: '2026-10-20' }
const consulta = { contractVersion: 1 as const, base: 'planejamento' as const, inicio: '2026-11', fim: '2026-11', modo: 'mensal' as const, filtros: {} }
it('005 pagina receitas e despesas no snapshot/orçamento recebidos sem provar fim por página cheia', async () => {
 const seen: string[] = []
 const reader = { consultar: async (s: typeof snapshot, q: { natureza?: string; pageSize: number }, b: ReturnType<typeof createOrcamentoRodada>) => {
  seen.push(s.readTime + '/' + q.natureza)
  return b.executar(q.pageSize, async () => ({ documentos: 1, valor: [{ colecao: 'lancamentosExternos', id: 'a', dados: { natureza: 'receita', descricao: 'Receita fictícia', categoriaId: 'cat', valorCentavos: 100, estimado: false, competenciaPlanejamento: '2026-11', dataPrevista: '2026-11-10', schemaVersion: 1, version: 1, createdAt: Timestamp.fromMillis(1), updatedAt: Timestamp.fromMillis(1), estadoObrigacao: 'ativa', liquidadoLiquidoCentavos: 0, jaLiquidada: false, ultimoEventoId: 'criarReceita__fixture' } }] }))
 } } as unknown as ReturnType<typeof createFinanceiroSnapshotReader>
 const source = createPainelPlanningSources(reader, 'A').find(s => s.id === 'externos')!
 const result = await source.paginar({ consulta, snapshot, orcamento: createOrcamentoRodada() })
 expect(result).toMatchObject({ completo: false, contribuicoes: [{ valorCentavos: 100 }] })
 expect(result.proxima).toBeDefined(); expect(seen).toEqual([t + '/receita'])
 await expect(source.paginar({ consulta: { ...consulta, fim: '2026-12', modo: '12meses' }, snapshot, orcamento: createOrcamentoRodada() })).rejects.toThrow()
})
it('adapters atuais não incluem protocolo007–010 e calendário vazio não vira fatura financeira', async () => {
 const reader = { consultar: async () => [] } as unknown as ReturnType<typeof createFinanceiroSnapshotReader>
 const sources = createPainelPlanningSources(reader, 'A')
 expect(sources.map(s => s.id)).toEqual(['externos', 'calendarios'])
 const page = await sources[1].paginar({ consulta, snapshot, orcamento: createOrcamentoRodada() })
 expect(page).toEqual({ completo: true, contribuicoes: [] })
})
it('cinquenta candidatas exigem nova página da mesma natureza antes de confirmar fim', async () => {
 const reader = { consultar: async (_s: unknown, q: { pageSize: number }, budget: ReturnType<typeof createOrcamentoRodada>) => budget.executar(q.pageSize, async () => ({ documentos: 50, valor: Array.from({ length: 50 }, (_, n) => ({ colecao: 'lancamentosExternos', id: 'a' + String(n).padStart(2, '0'), dados: { natureza: 'receita', descricao: 'Receita fictícia', categoriaId: 'cat', valorCentavos: 100, estimado: false, competenciaPlanejamento: '2026-11', dataPrevista: '2026-11-10', schemaVersion: 1, version: 1, createdAt: Timestamp.fromMillis(1), updatedAt: Timestamp.fromMillis(1), estadoObrigacao: 'ativa', liquidadoLiquidoCentavos: 0, jaLiquidada: false, ultimoEventoId: 'criarReceita__fixture' } })) })) } as unknown as ReturnType<typeof createFinanceiroSnapshotReader>
 const page = await createPainelPlanningSources(reader, 'A')[0].paginar({ consulta, snapshot, orcamento: createOrcamentoRodada() })
 expect(page.completo).toBe(false)
 expect(JSON.parse(page.proxima!)).toEqual({ natureza: 'receita', apos: { data: '2026-11-10', id: 'a49' } })
 expect(page.contribuicoes).toHaveLength(50)
})
