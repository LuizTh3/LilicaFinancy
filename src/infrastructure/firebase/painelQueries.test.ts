import { expect, it } from 'vitest'
import { createOrcamentoRodada, createPainelQueries } from './painelQueries'
import { registrarFontesPainel } from './painelSources'
import type { AdapterFontePainel } from './painelSources'
import type { ContribuicaoPainel, FontePainel } from '../../domain/finance/contracts/painel'
const time = '2026-10-20T12:00:00Z', now = Date.parse(time) + 1000
const snapshot = { uid: 'A', generation: 1, readTime: time, expiresAt: Date.parse(time) + 50 * 60000, contractRevision: 1 as const, hojeFinanceiro: '2026-10-20' }
const consulta = { contractVersion: 1 as const, base: 'planejamento' as const, inicio: '2026-11', fim: '2026-11', modo: 'mensal' as const, filtros: {} }
const linha = (id: string): ContribuicaoPainel => ({ chave: 'externo:' + id, autoridade: 'externo', origemId: id, competencia: '2026-11', dataFinanceira: '2026-11-01', base: 'planejamento', natureza: 'saida', valorCentavos: 100, estimado: false, fonte: 'persistida', revisao: 1 })
function fixture(adapters: AdapterFontePainel[]) {
 let current = true
 const ctx = { uid: 'A', generation: 1, atual: () => current, agora: () => now, abrirSnapshot: async (budget: ReturnType<typeof createOrcamentoRodada>) => budget.executar(1, async () => ({ documentos: 1, valor: snapshot })) }
 const fontes = registrarFontesPainel(adapters, adapters.map(a => ({ fonte: a.id, bases: a.bases, contractRevision: 1, estado: 'comprovada' as const, evidencia: 'fixture-local-only' })))
 return { queries: createPainelQueries(ctx, fontes), invalidate: () => { current = false } }
}
it('reserva documentos antes de operações concorrentes e não multiplica100 por fonte', async () => {
 const budget = createOrcamentoRodada(); let finish: (() => void) | undefined
 const first = budget.executar(50, async () => { await new Promise<void>(r => { finish = r }); return { documentos: 40, valor: 'first' } })
 await budget.executar(50, async () => ({ documentos: 50, valor: 'second' }))
 await expect(budget.executar(1, async () => ({ documentos: 1, valor: '' }))).rejects.toThrow()
 finish?.(); expect(await first).toBe('first')
 expect(budget.documentos).toBe(90); expect(budget.disponiveis).toBe(10)
})
it('oito requisições vazias/missing continuam sujeitas ao teto e falha consome concessão', async () => {
 const budget = createOrcamentoRodada()
 for (let i = 0; i < 8; i++) await budget.executar(1, async () => ({ documentos: 0, valor: undefined }))
 await expect(budget.executar(1, async () => ({ documentos: 0, valor: undefined }))).rejects.toThrow()
 const failure = createOrcamentoRodada()
 await expect(failure.executar(50, async () => { throw Error('NETWORK') })).rejects.toThrow('NETWORK')
 expect(failure.documentos).toBe(50)
 await expect(failure.executar(50, async () => ({ documentos: 51, valor: 0 }))).rejects.toThrow()
 expect(failure.disponiveis).toBe(0)
})
it('snapshot, filtro canônico e fontes pendentes nunca são substituídos por zero completo', async () => {
 const seen: string[] = []
 const f = fixture([{ id: 'externos', bases: ['planejamento'], contractRevision: 1, async paginar({ snapshot: t, orcamento }) { seen.push(t.readTime); return orcamento.executar(1, async () => ({ documentos: 1, valor: { contribuicoes: [linha('a')], completo: true } })) } }])
 const page = await f.queries.iniciar(consulta)
 expect(page).toMatchObject({ ok: true, valor: { completo: false, contribuicoes: [linha('a')], snapshot: { readTime: time } } })
 if (!page.ok) return
 expect(page.valor.cobertura.some(c => c.fonte === 'recorrencias' && c.estado === 'indisponivel')).toBe(true)
 expect(await f.queries.detalhar(page.valor.cursor!)).toMatchObject({ ok: true, valor: { snapshot: { readTime: time } } })
 f.invalidate()
 expect((await f.queries.detalhar(page.valor.cursor!)).ok).toBe(false)
 expect(seen).toEqual([time])
})
it('página vazia com continuação e fonte com página cheia não são fim presumido', async () => {
 let called = 0
 const adapter: AdapterFontePainel = { id: 'externos', bases: ['planejamento'], contractRevision: 1, async paginar({ posicao, orcamento }) { called++; return orcamento.executar(50, async () => ({ documentos: 50, valor: { contribuicoes: posicao ? [linha('a')] : [], completo: false, proxima: String(Number(posicao ?? '0') + 1) } })) } }
 const f = fixture([adapter]), page = await f.queries.iniciar(consulta)
 expect(page).toMatchObject({ ok: true, valor: { completo: false } })
 if (!page.ok) return
 const next = await f.queries.continuar(page.valor.cursor!)
 expect(next.ok).toBe(true); expect(called).toBeGreaterThan(1)
 expect(next).toMatchObject({ valor: { snapshot: { readTime: time }, completo: false } })
})
it('fila retoma fontes sem fome, preserva50 linhas e não perde buffers', async () => {
 const visited: FontePainel[] = []
 const adapters: AdapterFontePainel[] = (['externos', 'calendarios'] as const).map(id => ({ id, bases: ['planejamento'], contractRevision: 1, async paginar({ orcamento }) { visited.push(id); return orcamento.executar(50, async () => ({ documentos: 50, valor: { contribuicoes: Array.from({ length: 50 }, (_, n) => linha(id + n)), completo: true } })) } }))
 const f = fixture(adapters), pages: string[] = []
 let page = await f.queries.iniciar(consulta)
 for (let i = 0; i < 4 && page.ok; i++) { pages.push(...page.valor.contribuicoes.map(c => c.chave)); if (!page.valor.cursor) break; const next = await f.queries.continuar(page.valor.cursor); if (!next.ok) break; page = next }
 expect(new Set(pages).size).toBe(100); expect(visited).toEqual(['externos', 'calendarios'])
})
it('cursor não pode ser usado noutra instância e dispose apaga handles', async () => {
 const f = fixture([]), p = await f.queries.iniciar(consulta)
 if (!p.ok) throw Error('fixture')
 expect((await fixture([]).queries.continuar(p.valor.cursor!)).ok).toBe(false)
 f.queries.invalidarSessao()
 expect((await f.queries.detalhar(p.valor.cursor!)).ok).toBe(false)
})
it('reserva também o limite de duas janelas antes de aguardar snapshots concorrentes', async () => {
 const pending: (() => void)[] = []
 const q = createPainelQueries({ uid: 'A', generation: 1, atual: () => true, agora: () => now, abrirSnapshot: async budget => budget.executar(1, async () => { await new Promise<void>(resolve => { pending.push(resolve) }); return { documentos: 0, valor: snapshot } }) }, registrarFontesPainel([], []))
 const first = q.iniciar(consulta), second = q.iniciar(consulta)
 const third = await q.iniciar(consulta)
 expect(third).toMatchObject({ ok: false, erro: { codigo: 'limiteOperacional' } })
 for (const done of pending) done()
 expect((await first).ok).toBe(true); expect((await second).ok).toBe(true)
 q.invalidarSessao()
})
it.each(['cotaExcedida', 'configuracaoPendente', 'esquemaIncompativel', 'indisponivel'] as const)('preserva código %s sem expor mensagem privada da fonte', async codigo => {
 const f = fixture([{ id: 'externos', bases: ['planejamento'], contractRevision: 1, async paginar() { throw Object.assign(Error('private provider detail'), { code: codigo }) } }])
 const result = await f.queries.iniciar(consulta)
 expect(result).toMatchObject({ ok: false, erro: { codigo } })
 expect(JSON.stringify(result)).not.toContain('private provider detail')
})
