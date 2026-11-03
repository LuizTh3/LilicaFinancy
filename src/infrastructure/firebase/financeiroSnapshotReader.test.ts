import { expect, it, vi } from 'vitest'
import { createFinanceiroSnapshotReader } from './financeiroSnapshotReader'
const time = '2026-10-20T12:00:00.123456Z', prefix = 'projects/fixture-project/databases/(default)/documents/users/A/'
function fixture() {
 let current = true
 const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify([{ readTime: time }])))
 const token = vi.fn(async () => 'fixture-token'), agora = vi.fn(() => Date.parse(time) + 1000)
 const reader = createFinanceiroSnapshotReader({ projectId: 'fixture-project', uid: 'A', generation: 1, atual: () => current, token, agora, fetcher })
 return { reader, fetcher, token, agora, invalidate: () => { current = false } }
}
it('sondagem inclusive vazia não vira contribuição e todas fontes usam readTime explícito', async () => {
 const f = fixture(), t = await f.reader.iniciar()
 await f.reader.consultar(t, { colecao: 'lancamentosExternos', natureza: 'despesa', competencia: '2026-11', pageSize: 50 })
 await f.reader.consultar(t, { colecao: 'faturas', inicio: '2026-11', fim: '2027-10', pageSize: 50 })
 expect(JSON.parse(String(f.fetcher.mock.calls[0][1]?.body))).not.toHaveProperty('readTime')
 for (const [, init] of f.fetcher.mock.calls.slice(1)) {
  expect(JSON.parse(String(init?.body)).readTime).toBe(time)
  expect(init).toMatchObject({ cache: 'no-store', redirect: 'error', method: 'POST' })
 }
 expect(t.expiresAt).toBe(Date.parse(time) + 50 * 60000)
})
it('batch found/missing fora de ordem é mapeado por nome e mantém precisão de timestamp', async () => {
 const f = fixture(), t = await f.reader.iniciar()
 f.fetcher.mockResolvedValueOnce(new Response(JSON.stringify([
  { missing: prefix + 'faturas/c__2026-11', readTime: time },
  { found: { name: prefix + 'lancamentosExternos/a', fields: { version: { integerValue: '1' }, updatedAt: { timestampValue: time } } }, readTime: time },
 ])))
 const docs = await f.reader.obter(t, [{ colecao: 'lancamentosExternos', id: 'a' }, { colecao: 'faturas', id: 'c__2026-11' }])
 expect(docs.map(d => d.id)).toEqual(['a', 'c__2026-11'])
 expect(docs[0].dados?.updatedAt).toMatchObject({ nanoseconds: 123456000 })
 expect(docs[1].dados).toBeUndefined()
})
it('recusa referências, consultas livres e limites antes de rede', async () => {
 const f = fixture(), t = await f.reader.iniciar(), count = f.fetcher.mock.calls.length
 for (const ref of [{ colecao: 'faturas', id: '../B' }, { colecao: 'admins', id: 'A' }, { colecao: 'seriesRecorrentes', id: 's' }]) await expect(f.reader.obter(t, [ref as never])).rejects.toThrow()
 await expect(f.reader.obter(t, Array.from({ length: 9 }, (_, i) => ({ colecao: 'lancamentosExternos' as const, id: 'a' + i })))).rejects.toThrow()
 for (const patch of [{ pageSize: 51 }, { pageSize: 0 }, { fim: '2027-12' }, { where: {} }]) await expect(f.reader.consultar(t, { colecao: 'faturas', inicio: '2026-11', fim: '2026-11', pageSize: 50, ...patch } as never)).rejects.toThrow()
 expect(f.fetcher.mock.calls.length).toBe(count)
})
it('recusa resposta alheia, duplicada, readTime diferente ou inteiro inseguro', async () => {
 for (const rows of [
  [{ document: { name: prefix.replace('/A/', '/B/') + 'faturas/c__2026-11', fields: {} }, readTime: time }],
  [1, 2].map(() => ({ document: { name: prefix + 'faturas/c__2026-11', fields: {} }, readTime: time })),
  [{ readTime: '2026-10-20T12:00:01Z' }],
  [{ document: { name: prefix + 'faturas/c__2026-11', fields: { value: { integerValue: '9007199254740992' } } }, readTime: time }],
 ]) {
  const f = fixture(), t = await f.reader.iniciar()
  f.fetcher.mockResolvedValueOnce(new Response(JSON.stringify(rows)))
  await expect(f.reader.consultar(t, { colecao: 'faturas', inicio: '2026-11', fim: '2026-11', pageSize: 50 })).rejects.toThrow()
 }
})
it('conta sondagem, candidatos e referências no orçamento do chamador', async () => {
 const f = fixture(), limites: number[] = [], gastos: number[] = []
 const budget = { documentos: 0, requisicoes: 0, disponiveis: 100, async executar<T>(limite: number, op: () => Promise<{ documentos: number; valor: T }>) { limites.push(limite); const r = await op(); gastos.push(r.documentos); return r.valor } }
 const t = await f.reader.iniciar(budget)
 f.fetcher.mockResolvedValueOnce(new Response(JSON.stringify([{ document: { name: prefix + 'faturas/c__2026-11', fields: {} }, readTime: time }])))
 await f.reader.consultar(t, { colecao: 'faturas', inicio: '2026-11', fim: '2026-11', pageSize: 40 }, budget)
 f.fetcher.mockResolvedValueOnce(new Response(JSON.stringify([{ missing: prefix + 'faturas/c__2026-11', readTime: time }])))
 await f.reader.obter(t, [{ colecao: 'faturas', id: 'c__2026-11' }], budget)
 expect(limites).toEqual([1, 40, 1]); expect(gastos).toEqual([0, 1, 1])
})
it('invalidação depois do token impede rede; expiração e dispose não renovam consulta', async () => {
 const f = fixture(), t = await f.reader.iniciar()
 f.agora.mockReturnValue(t.expiresAt)
 await expect(f.reader.obter(t, [{ colecao: 'faturas', id: 'c__2026-11' }])).rejects.toThrow()
 f.agora.mockReturnValue(Date.parse(time) + 1000)
 f.token.mockImplementationOnce(async () => { f.invalidate(); return 'old' })
 await expect(f.reader.obter(t, [{ colecao: 'faturas', id: 'c__2026-11' }])).rejects.toThrow()
 expect(f.fetcher).toHaveBeenCalledTimes(1)
 const other = fixture(); other.reader.invalidarSessao()
 await expect(other.reader.iniciar()).rejects.toThrow()
 expect(other.fetcher).not.toHaveBeenCalled()
})
it('aborta requisições em voo e descarta resposta tardia após dispose', async () => {
 const f = fixture(); let signal: AbortSignal | undefined
 f.fetcher.mockImplementationOnce(async (_url, init) => { signal = init?.signal as AbortSignal; f.reader.invalidarSessao(); return new Response(JSON.stringify([{ readTime: time }])) })
 await expect(f.reader.iniciar()).rejects.toThrow()
 expect(signal?.aborted).toBe(true)
})
it('timeout encerra requisição sem loop de retry', async () => {
 vi.useFakeTimers()
 try {
  const f = fixture()
  f.fetcher.mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('TIMEOUT')))))
  const rejected = expect(f.reader.iniciar()).rejects.toThrow('TIMEOUT')
  await vi.advanceTimersByTimeAsync(20000); await rejected
  expect(f.fetcher).toHaveBeenCalledTimes(1)
 } finally { vi.useRealTimers() }
})
