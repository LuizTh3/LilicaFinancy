import { beforeEach, expect, it, vi } from 'vitest'
import type { Firestore } from 'firebase/firestore'
import { createCartoesRepository } from './cartoesRepository'
import type { ComandoCartao } from '../../domain/finance/contracts/cartoes'
const memory=vi.hoisted(()=>({docs:new Map<string,Record<string,unknown>>(),reads:[] as string[],race:undefined as (()=>void)|undefined,offline:false,queryError:undefined as unknown}))
vi.mock('firebase/firestore',async original=>{
 const actual=await original<typeof import('firebase/firestore')>()
 const snap=(path:string)=>({exists:()=>memory.docs.has(path),data:()=>memory.docs.get(path)})
 return {...actual,doc:(_db:unknown,...parts:string[])=>({path:parts.join('/')}),collection:(_db:unknown,...parts:string[])=>({path:parts.join('/')}),query:(...p:unknown[])=>p,getDocsFromServer:async()=>{if(memory.queryError)throw memory.queryError;return {docs:[]}},serverTimestamp:()=>actual.Timestamp.fromMillis(1000),getDocFromServer:async(r:{path:string})=>{if(memory.offline)throw Error('offline');return snap(r.path)},runTransaction:async(_db:unknown,fn:(tx:unknown)=>Promise<unknown>)=>{
  let writes=new Map<string,Record<string,unknown>>(),writing=false
  const tx={get:async(r:{path:string})=>{if(writing)throw Error('READ_AFTER_WRITE');memory.reads.push(r.path);return snap(r.path)},set:(r:{path:string},d:Record<string,unknown>)=>{writing=true;writes.set(r.path,d)}}
  let out=await fn(tx)
  if(memory.race){memory.race();memory.race=undefined;writes=new Map();writing=false;out=await fn(tx)}
  for(const [p,d] of writes)memory.docs.set(p,d)
  return out
 }}
})
const db={} as Firestore,ctx={uid:'A',generation:1,atual:()=>true}
const command:ComandoCartao={contractVersion:1,tipo:'criarCartao',operationKey:'op-1',alvoId:'card-1',expectedVersion:0,payload:{banco:'Banco',nome:'Nome',titularId:'holder',diaFechamento:10,diaVencimento:17}}
beforeEach(async()=>{memory.docs.clear();memory.reads=[];memory.race=undefined;memory.offline=false;memory.queryError=undefined;const {Timestamp}=await import('firebase/firestore');memory.docs.set('users/A/titulares/holder',{nome:'Pessoa',estado:'ativo',schemaVersion:1,version:1,createdAt:Timestamp.fromMillis(100),updatedAt:Timestamp.fromMillis(100)})})
it('cria par atômico e recupera recibo antes da versão ou atividade atual',async()=>{
 const r=createCartoesRepository(db,ctx),first=await r.executar(command)
 expect(first).toMatchObject({ok:true,valor:{estado:'confirmado',resultVersion:1}})
 expect(memory.reads).toEqual(['users/A/operacoesCartoes/criarCartao__op-1','users/A/cartoes/card-1','users/A/titulares/holder'])
 const h=memory.docs.get('users/A/titulares/holder')!;memory.docs.set('users/A/titulares/holder',{...h,estado:'arquivado',archivedAt:h.updatedAt})
 expect(await r.executar(command)).toEqual(first)
 expect(await r.executar({...command,payload:{...command.payload,nome:'Diferente'}})).toMatchObject({ok:false,erro:{codigo:'conflitoIdempotencia'}})
 expect(memory.docs.size).toBe(3)
})
it('no-op não grava recibo e conflito de revisão não é sobrescrito por retry',async()=>{
 const r=createCartoesRepository(db,ctx);await r.executar(command)
 const edit={...command,tipo:'editarCartao' as const,expectedVersion:1,operationKey:'edit'}
 expect(await r.executar(edit)).toMatchObject({ok:true,valor:{estado:'semAlteracao'}})
 expect(memory.docs.has('users/A/operacoesCartoes/editarCartao__edit')).toBe(false)
 memory.race=()=>{const saved=memory.docs.get('users/A/cartoes/card-1')!;memory.docs.set('users/A/cartoes/card-1',{...saved,version:2,nome:'Outra aba'})}
 expect(await r.executar({...edit,payload:{...edit.payload,nome:'Meu nome'}})).toMatchObject({ok:false,erro:{codigo:'conflitoVersao'}})
 expect(memory.docs.get('users/A/cartoes/card-1')?.nome).toBe('Outra aba')
})
it('resposta perdida pós-commit recupera a mesma confirmação e descritor não reenvia conteúdo',async()=>{
 const r=createCartoesRepository(db,ctx,async()=>{throw Error('lost response')})
 expect(await r.executar(command)).toMatchObject({ok:true,valor:{estado:'confirmado'}})
 const {payload,...descritor}=command
 expect(payload).toHaveProperty('nome')
 expect(await r.consultarOperacao({modo:'descritor',descritor})).toMatchObject({ok:true,valor:{estado:'confirmado',verificacao:'descritor'}})
 memory.offline=true
 expect(await r.consultarOperacao({modo:'descritor',descritor})).toEqual({ok:true,valor:{estado:'indeterminado'}})
 expect(memory.docs.size).toBe(3)
})
it('bloqueia titular novo arquivado, sessão inválida e não vaza mensagem SDK de índice',async()=>{
 const h=memory.docs.get('users/A/titulares/holder')!;memory.docs.set('users/A/titulares/holder',{...h,estado:'arquivado',archivedAt:h.updatedAt})
 expect(await createCartoesRepository(db,ctx).executar(command)).toMatchObject({ok:false,erro:{codigo:'referenciaInvalida'}})
 expect(await createCartoesRepository(db,{...ctx,atual:()=>false}).executar(command)).toMatchObject({ok:false,erro:{codigo:'semPermissao'}})
 memory.queryError=Object.assign(Error('index https://console.firebase.google.com/private'),{code:'failed-precondition'})
 const out=await createCartoesRepository(db,ctx).listar('ativo')
 expect(out).toMatchObject({ok:false,erro:{codigo:'configuracaoPendente'}})
 expect(!out.ok&&out.erro.mensagem).not.toContain('https:')
 expect(memory.docs.size).toBe(1)
})
it('descarta sucesso de sessão que mudou após o commit e rejeita cursor de outra geração',async()=>{
 let current=true
 const r=createCartoesRepository(db,{...ctx,atual:()=>current},async()=>{current=false})
 expect(await r.executar(command)).toMatchObject({ok:false,erro:{codigo:'semPermissao'}})
 expect(memory.docs.has('users/A/operacoesCartoes/criarCartao__op-1')).toBe(true)
 expect(await createCartoesRepository(db,ctx).listar('ativo',50,{uid:'A',generation:2,filtro:'ativo',nome:'Nome',id:'card-1'})).toMatchObject({ok:false,erro:{codigo:'valorInvalido'}})
 expect(await createCartoesRepository(db,ctx).listar('ativo',51)).toMatchObject({ok:false,erro:{codigo:'valorInvalido'}})
})
it('arquiva sem titular e recupera recibo anterior; no-op não cria evento nem reativa',async()=>{
 const r=createCartoesRepository(db,ctx),first=await r.executar(command)
 memory.docs.delete('users/A/titulares/holder');memory.reads=[]
 const archive:ComandoCartao={contractVersion:1,tipo:'arquivarCartao',operationKey:'archive',alvoId:'card-1',expectedVersion:1,payload:{}}
 expect(await r.executar(archive)).toMatchObject({ok:true,valor:{estado:'confirmado',resultVersion:2}})
 expect(memory.reads).toEqual(['users/A/operacoesCartoes/arquivarCartao__archive','users/A/cartoes/card-1'])
 expect(memory.docs.get('users/A/cartoes/card-1')).toMatchObject({nome:'Nome',estado:'arquivado',version:2})
 expect(await r.executar(command)).toEqual(first)
 expect(await r.executar({...archive,operationKey:'noop',expectedVersion:2})).toMatchObject({ok:true,valor:{estado:'semAlteracao'}})
 expect(memory.docs.has('users/A/operacoesCartoes/arquivarCartao__noop')).toBe(false)
})
