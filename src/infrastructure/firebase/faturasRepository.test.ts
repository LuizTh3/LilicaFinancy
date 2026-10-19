import { beforeEach, expect, it, vi } from 'vitest'
import type { Firestore } from 'firebase/firestore'
import { calendarioBaseFatura } from '../../domain/finance/invoiceCalendar'
import { createFaturasRepository } from './faturasRepository'
const memory=vi.hoisted(()=>({docs:new Map<string,Record<string,unknown>>(),reads:[] as string[],race:undefined as (()=>void)|undefined,offline:false}))
vi.mock('firebase/firestore',async original=>{
 const a=await original<typeof import('firebase/firestore')>()
 const snap=(path:string)=>({exists:()=>memory.docs.has(path),data:()=>memory.docs.get(path)})
 return {...a,doc:(_db:unknown,...p:string[])=>({path:p.join('/')}),getDocFromServer:async(r:{path:string})=>{if(memory.offline)throw Error('offline');return snap(r.path)},serverTimestamp:()=>a.Timestamp.fromMillis(1000),runTransaction:async(_db:unknown,fn:(tx:unknown)=>Promise<unknown>)=>{
  let writes=new Map<string,Record<string,unknown>>(),writing=false
  const tx={get:async(r:{path:string})=>{if(writing)throw Error('READ_AFTER_WRITE');memory.reads.push(r.path);return snap(r.path)},set:(r:{path:string},d:Record<string,unknown>)=>{writing=true;writes.set(r.path,d)}}
  let result=await fn(tx)
  if(memory.race){memory.race();memory.race=undefined;writes=new Map();writing=false;result=await fn(tx)}
  for(const [path,data] of writes)memory.docs.set(path,data)
  return result
 }}
})
const db={} as Firestore,ctx={uid:'A',generation:1,atual:()=>true}
const base=calendarioBaseFatura('2026-10',10,17);if(!base.ok)throw Error('fixture')
const command={contractVersion:1 as const,tipo:'confirmarFatura' as const,operationKey:'key',alvoId:'card__2026-10',expectedVersion:0,payload:{...base.valor,cartaoId:'card',cartaoVersion:1}}
beforeEach(async()=>{memory.docs.clear();memory.reads=[];memory.race=undefined;memory.offline=false;const {Timestamp}=await import('firebase/firestore');memory.docs.set('users/A/cartoes/card',{banco:'Banco',nome:'Nome',titularId:'holder',diaFechamento:10,diaVencimento:17,estado:'ativo',schemaVersion:1,version:1,ultimoEventoId:'criarCartao__key',createdAt:Timestamp.fromMillis(1),updatedAt:Timestamp.fromMillis(1)})})
it('lê recibo, alvo, cartão e quatro ausências antes das duas escritas; mesmo período é existente',async()=>{
 const repo=createFaturasRepository(db,ctx)
 expect(await repo.executar(command)).toMatchObject({ok:true,valor:{estado:'confirmado'}})
 expect(memory.reads).toEqual(['users/A/operacoesFaturas/confirmarFatura__key','users/A/faturas/card__2026-10','users/A/cartoes/card','users/A/faturas/card__2026-08','users/A/faturas/card__2026-09','users/A/faturas/card__2026-11','users/A/faturas/card__2026-12'])
 expect(await repo.executar({...command,operationKey:'other'})).toMatchObject({ok:true,valor:{estado:'existente'}})
 expect(memory.docs.size).toBe(3)
 expect(memory.docs.has('users/A/operacoesFaturas/confirmarFatura__other')).toBe(false)
 expect(await repo.executar({...command,payload:{...command.payload,vencimento:'2026-10-19' as typeof command.payload.vencimento}})).toMatchObject({ok:false,erro:{codigo:'conflitoIdempotencia'}})
})
it('retry não adota revisão de cartão nova; colisão de schema falha fechada',async()=>{
 const repo=createFaturasRepository(db,ctx)
 memory.race=()=>{const c=memory.docs.get('users/A/cartoes/card')!;memory.docs.set('users/A/cartoes/card',{...c,version:2})}
 expect(await repo.executar(command)).toMatchObject({ok:false,erro:{codigo:'conflitoVersao'}})
 expect(memory.docs.size).toBe(1)
 memory.docs.set('users/A/faturas/card__2026-10',{itens:[],schemaVersion:2})
 expect(await repo.executar(command)).toMatchObject({ok:false,erro:{codigo:'esquemaIncompativel'}})
})
it('recupera resposta perdida; ajustar após arquivar preserva snapshot e histórico anterior',async()=>{
 const repo=createFaturasRepository(db,ctx,async()=>{throw Error('lost')})
 expect(await repo.executar(command)).toMatchObject({ok:true,valor:{estado:'confirmado'}})
 const card=memory.docs.get('users/A/cartoes/card')!;memory.docs.set('users/A/cartoes/card',{...card,estado:'arquivado',archivedAt:card.updatedAt})
 expect(await repo.executar(command)).toMatchObject({ok:true,valor:{estado:'confirmado'}})
 const adjust={contractVersion:1 as const,tipo:'ajustarVencimento' as const,operationKey:'adjust',alvoId:command.alvoId,expectedVersion:1,payload:{vencimento:'2026-10-19',motivo:'Emissor confirmou'}}
 expect(await repo.executar(adjust)).toMatchObject({ok:true,valor:{resultVersion:2}})
 const changed=memory.docs.get('users/A/faturas/card__2026-10')!
 expect(changed).toMatchObject({inicio:base.valor.inicio,fechamento:base.valor.fechamento,calendarioOrigem:base.valor.calendarioOrigem,vencimento:'2026-10-19'})
 expect(memory.docs.get('users/A/operacoesFaturas/ajustarVencimento__adjust')).toMatchObject({antes:{vencimento:'2026-10-17'},comando:{payload:{motivo:'Emissor confirmou'}}})
 expect(await repo.executar({...adjust,operationKey:'noop',expectedVersion:2})).toMatchObject({ok:true,valor:{estado:'semAlteracao'}})
 expect(await repo.executar({...adjust,operationKey:'stale'})).toMatchObject({ok:false,erro:{codigo:'conflitoVersao'}})
})
it('arquivamento concorrente bloqueia nova confirmação no retry; sessão tardia não produz sucesso',async()=>{
 const repo=createFaturasRepository(db,ctx)
 memory.race=()=>{const card=memory.docs.get('users/A/cartoes/card')!;memory.docs.set('users/A/cartoes/card',{...card,estado:'arquivado',archivedAt:card.updatedAt})}
 expect(await repo.executar(command)).toMatchObject({ok:false,erro:{codigo:'referenciaInvalida'}})
 expect(memory.docs.has('users/A/faturas/card__2026-10')).toBe(false)
 const card=memory.docs.get('users/A/cartoes/card')!;delete card.archivedAt;card.estado='ativo'
 let current=true
 expect(await createFaturasRepository(db,{...ctx,atual:()=>current},async()=>{current=false}).executar(command)).toMatchObject({ok:false,erro:{codigo:'semPermissao'}})
})
