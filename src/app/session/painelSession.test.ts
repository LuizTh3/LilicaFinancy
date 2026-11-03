import { afterEach, expect, it } from 'vitest'
import { advancePrivateFinanceGeneration, clearPrivateFinanceResources, registerPrivateFinanceResource } from './financeSession'
import { createPainelState } from '../../features/painel/painelState'
import { createPainelQueries } from '../../infrastructure/firebase/painelQueries'
import { registrarFontesPainel } from '../../infrastructure/firebase/painelSources'
import { createFinanceiroSnapshotReader } from '../../infrastructure/firebase/financeiroSnapshotReader'

afterEach(() => clearPrivateFinanceResources())
it('limpeza continua mesmo com callback defeituoso e não repete callbacks removidos', () => {
 let count = 0
 registerPrivateFinanceResource(() => { throw Error('fixture') })
 registerPrivateFinanceResource(() => { count++ })
 const remove = registerPrivateFinanceResource(() => { count += 100 })
 remove(); clearPrivateFinanceResources(); clearPrivateFinanceResources()
 expect(count).toBe(1)
})
it('logout/revogação/geração invalidam estado, filtros e handles já registrados', async () => {
 const time = '2026-10-20T12:00:00Z', agora = () => Date.parse(time) + 1000
 const state = createPainelState({ uid: 'A', generation: 1, atual: () => true, agora })
 const consulta = { contractVersion: 1 as const, base: 'planejamento' as const, inicio: '2026-11', fim: '2026-11', modo: 'mensal' as const, filtros: { categorias: ['privada'] } }
 const id = state.iniciar(consulta)
 const queries = createPainelQueries({ uid: 'A', generation: 1, atual: () => true, agora, abrirSnapshot: async () => ({ uid: 'A', generation: 1, readTime: time, expiresAt: Date.parse(time) + 50 * 60000, contractRevision: 1, hojeFinanceiro: '2026-10-20' }) }, registrarFontesPainel([], []))
 const page = await queries.iniciar(consulta)
 clearPrivateFinanceResources()
 expect(state.ler()).toEqual({ estado: 'invalidado' })
 if (!page.ok) throw Error('fixture')
 expect(state.receber(id, page.valor)).toBe(false)
 expect((await queries.detalhar(page.valor.cursor!)).ok).toBe(false)
 expect((await queries.iniciar(consulta)).ok).toBe(false)
})
it('limpeza aborta rede em voo e resposta tardia não devolve dados', async () => {
 const time = '2026-10-20T12:00:00Z'; let signal: AbortSignal | undefined, finish: ((r: Response) => void) | undefined
 const reader = createFinanceiroSnapshotReader({ projectId: 'fixture-project', uid: 'A', generation: 1, atual: () => true, agora: () => Date.parse(time), token: async () => 'fixture-token', fetcher: async (_url, init) => { signal = init?.signal as AbortSignal; return new Promise<Response>(resolve => { finish = resolve }) } })
 const request = expect(reader.iniciar()).rejects.toThrow()
 await Promise.resolve(); await Promise.resolve()
 clearPrivateFinanceResources()
 expect(signal?.aborted).toBe(true)
 finish?.(new Response(JSON.stringify([{ readTime: time }])))
 await request
})
it('fronteira usada pelo SessionProvider avança geração antes de invalidar recursos', () => {
 let generation = 1, observed = 0
 registerPrivateFinanceResource(() => { observed = generation })
 expect(advancePrivateFinanceGeneration({ next: () => ++generation })).toBe(2)
 expect(observed).toBe(2)
})
