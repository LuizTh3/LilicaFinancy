import { expect, it, vi } from 'vitest'
import { createExternosSnapshotReader } from './externosSnapshotReader'

const time = '2026-10-18T12:00:00.123456Z'
const millis = Date.parse(time)
function fixture() {
 let current = true
 const fetcher = vi.fn<typeof fetch>().mockImplementation(async()=>new Response(JSON.stringify([{readTime:time}]),{status:200}))
 const token = vi.fn(async () => 'fixture-only-token')
 const now = vi.fn(() => millis+1000)
 const reader = createExternosSnapshotReader({projectId:'fixture-project',uid:'A',generation:1,atual:()=>current,token,agora:now,fetcher})
 return { reader, fetcher, token, now, invalidate:()=>{current=false} }
}
it('obtém T sem usar o resultado sentinela e aplica T explícito nas páginas e dependências', async () => {
 const f = fixture(), t = await f.reader.iniciar()
 await f.reader.consultar(t,{colecao:'lancamentosExternos',natureza:'despesa',competencia:'2026-10',pageSize:50})
 f.fetcher.mockResolvedValueOnce(new Response(JSON.stringify([{missing:'projects/fixture-project/databases/(default)/documents/users/A/lancamentosExternos/id-1',readTime:time}]),{status:200}))
 expect(await f.reader.obter(t,[{colecao:'lancamentosExternos',id:'id-1'}])).toEqual([{id:'id-1',colecao:'lancamentosExternos',dados:undefined}])
 const calls = f.fetcher.mock.calls
 expect(calls[0][0]).toBe('https://firestore.googleapis.com/v1/projects/fixture-project/databases/(default)/documents/users/A:runQuery')
 expect(JSON.parse(String(calls[0][1]?.body))).not.toHaveProperty('readTime')
 for(const call of calls.slice(1)) expect(JSON.parse(String(call[1]?.body)).readTime).toBe(time)
 expect(t.expiresAt).toBe(millis+50*60000)
})
it('recusa limites, caminho injetado e snapshot de outra geração sem rede', async () => {
 const f = fixture(), t = await f.reader.iniciar(), count=f.fetcher.mock.calls.length
 await expect(f.reader.obter(t,Array.from({length:9},(_,i)=>({colecao:'lancamentosExternos' as const,id:'id-'+i})))).rejects.toThrow()
 await expect(f.reader.obter(t,[{colecao:'lancamentosExternos',id:'../other'}])).rejects.toThrow()
 await expect(f.reader.consultar({...t,uid:'B'},{colecao:'lancamentosExternos',natureza:'despesa',competencia:'2026-10',pageSize:50})).rejects.toThrow()
 await expect(f.reader.consultar(t,{colecao:'lancamentosExternos',natureza:'despesa',competencia:'2026-10',pageSize:51})).rejects.toThrow()
 expect(f.fetcher.mock.calls).toHaveLength(count)
})
it('rejeita expiração, resposta tardia e token ausente antes de exibir dados', async () => {
 const f=fixture(), t=await f.reader.iniciar()
 f.now.mockReturnValue(millis+50*60000)
 await expect(f.reader.obter(t,[{colecao:'lancamentosExternos',id:'id-1'}])).rejects.toThrow()
 f.now.mockReturnValue(millis+1000)
 f.token.mockImplementationOnce(async()=>{f.invalidate();return 'old-token'})
 const count=f.fetcher.mock.calls.length
 await expect(f.reader.obter(t,[{colecao:'lancamentosExternos',id:'id-1'}])).rejects.toThrow()
 expect(f.fetcher.mock.calls).toHaveLength(count)
 const other=fixture();other.token.mockResolvedValue('')
 await expect(other.reader.iniciar()).rejects.toThrow()
 expect(other.fetcher).not.toHaveBeenCalled()
})
it('não aceita resposta de outro UID ou status de erro como conjunto completo', async () => {
 const f=fixture(), t=await f.reader.iniciar()
 f.fetcher.mockResolvedValueOnce(new Response(JSON.stringify([{document:{name:'projects/fixture-project/databases/(default)/documents/users/B/lancamentosExternos/id-1',fields:{}},readTime:time}]),{status:200}))
 await expect(f.reader.consultar(t,{colecao:'lancamentosExternos',natureza:'despesa',competencia:'2026-10',pageSize:50})).rejects.toThrow()
 f.fetcher.mockResolvedValueOnce(new Response('{}',{status:403}))
 await expect(f.reader.obter(t,[{colecao:'lancamentosExternos',id:'id-1'}])).rejects.toMatchObject({code:'semPermissao'})
})
