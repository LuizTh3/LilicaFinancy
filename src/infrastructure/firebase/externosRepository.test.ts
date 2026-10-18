import { beforeEach, expect, it, vi } from 'vitest'
import type { Firestore } from 'firebase/firestore'
import { createExternosRepository } from './externosRepository'
import type { ComandoExterno } from '../../domain/finance/contracts/externos'
const store=vi.hoisted(()=>({docs:new Map<string,Record<string,unknown>>(),reads:[] as string[],preflightError:false}))
vi.mock('firebase/firestore',async original=>{
 const actual=await original<typeof import('firebase/firestore')>()
 const snap=(path:string)=>({exists:()=>store.docs.has(path),data:()=>store.docs.get(path)})
 return {...actual,doc:(_db:unknown,...parts:string[])=>({path:parts.join('/')}),serverTimestamp:()=>actual.Timestamp.fromMillis(1000),getDocFromServer:async(r:{path:string})=>{if(store.preflightError&&r.path.includes('/categorias/'))throw Error('offline');return snap(r.path)},runTransaction:async(_db:unknown,callback:(tx:unknown)=>Promise<unknown>)=>{
  let writing=false;const writes:{path:string;data:Record<string,unknown>;patch:boolean}[]=[]
  const out=await callback({get:async(r:{path:string})=>{if(writing)throw Error('READ_AFTER_WRITE');store.reads.push(r.path);return snap(r.path)},set:(r:{path:string},data:Record<string,unknown>)=>{writing=true;writes.push({path:r.path,data,patch:false})},update:(r:{path:string},data:Record<string,unknown>)=>{writing=true;writes.push({path:r.path,data,patch:true})}})
  for(const w of writes)store.docs.set(w.path,w.patch?{...store.docs.get(w.path),...w.data}:w.data)
  return out
 }}
})
const db={} as Firestore
const ctx={uid:'A',generation:1,timezone:'America/Rio_Branco',atual:()=>true,token:async()=>'fixture',agora:()=>1000}
const command:ComandoExterno={contractVersion:1,tipo:'criarDespesa',operationKey:'key-1',origemId:'origin-1',expectedVersion:0,dados:{natureza:'despesa',descricao:'Internet',categoriaId:'cat-1',valorCentavos:10000,estimado:false,competenciaPlanejamento:'2026-10',vencimento:'2026-11-10',dataConsumo:'2026-10-18'}}
beforeEach(async()=>{store.docs.clear();store.reads=[];store.preflightError=false;const {Timestamp}=await import('firebase/firestore');store.docs.set('users/A/categorias/cat-1',{nome:'Casa',estado:'ativo',natureza:'despesa',schemaVersion:1,version:1,createdAt:Timestamp.fromMillis(100),updatedAt:Timestamp.fromMillis(100)})})
it('criação lê somente recibo na transação, grava par uma vez e congela categoria sem reescrever conteúdo',async()=>{
 const repo=createExternosRepository(db,ctx),first=await repo.executar(command)
 expect(first).toMatchObject({ok:true,valor:{eventoId:'criarDespesa__key-1',origemId:'origin-1',resultVersion:1}})
 expect(store.reads).toEqual(['users/A/operacoesExternas/criarDespesa__key-1'])
 expect(store.docs.get('users/A/categorias/cat-1')).toMatchObject({schemaVersion:2,version:1,nome:'Casa',usoFinanceiro:{origemId:'origin-1',eventoId:'criarDespesa__key-1'}})
 expect(await repo.executar(command)).toEqual(first)
 expect(store.docs.size).toBe(3)
 expect(await repo.executar({...command,dados:{...command.dados,valorCentavos:20000}})).toMatchObject({ok:false,erro:{codigo:'conflitoIdempotencia'}})
})
it('recibo confirmado prevalece sobre preflight que falha ou referência arquivada depois',async()=>{
 const repo=createExternosRepository(db,ctx),first=await repo.executar(command)
 const cat=store.docs.get('users/A/categorias/cat-1')!;store.docs.set('users/A/categorias/cat-1',{...cat,estado:'arquivado',archivedAt:cat.updatedAt})
 expect(await repo.executar(command)).toEqual(first)
 store.preflightError=true
 expect(await repo.executar(command)).toEqual(first)
})
it('resposta perdida após commit é resolvida pelo mesmo recibo sem novo par',async()=>{
 const out=await createExternosRepository(db,ctx,async()=>{throw Error('lost-response')}).executar(command)
 expect(out).toMatchObject({ok:true,valor:{estado:'confirmado',eventoId:'criarDespesa__key-1'}})
 expect(store.docs.size).toBe(3)
})
