import { afterAll, beforeAll, expect, it } from 'vitest'
import { collection, deleteDoc, doc, getDocFromServer, getDocsFromServer, limit, query, serverTimestamp, setDoc, updateDoc, writeBatch, Timestamp } from 'firebase/firestore'
import { integrationClients } from './support/clients'
import { recordFixture } from './support/manifest'
import { createCadastrosRepository } from '../../src/infrastructure/firebase/cadastrosRepository'
import { descrever } from '../../src/domain/finance/cadastros'
import type { Colecao, ComandoCadastro, DadosCadastro } from '../../src/domain/finance/contracts/cadastros'
import { hojeNoFuso } from '../../src/domain/finance/calendar'
let clients:Awaited<ReturnType<typeof integrationClients>>
const day=()=>{const r=hojeNoFuso(Date.now(),'America/Rio_Branco');if(!r.ok)throw Error('CLOCK');return r.valor}
const denied=(p:Promise<unknown>)=>expect(p).rejects.toMatchObject({code:'permission-denied'})
beforeAll(async()=>{
 clients=await integrationClients()
 for(const c of [clients.a,clients.b,clients.admin]){
  const p=await getDocFromServer(doc(c.db,'users',c.auth.currentUser!.uid))
  const token=await c.auth.currentUser!.getIdTokenResult()
  if(p.data()?.primeiro_login!==false||Number(token.claims.auth_time)*1000<=p.data()?.passwordChangeCompletedAt?.toMillis())throw Error('READY_TEST_ACCOUNT_REQUIRED')
 }
 if(!(await getDocFromServer(doc(clients.admin.db,'admins',clients.admin.auth.currentUser!.uid))).data()?.enabled)throw Error('ADMIN_TEST_ROLE_REQUIRED')
 const pending=await getDocFromServer(doc(clients.pending.db,'users',clients.pending.auth.currentUser!.uid))
 if(pending.data()?.primeiro_login!==true)throw Error('PENDING_TEST_ACCOUNT_REQUIRED')
})
afterAll(async()=>{await clients?.close()})
function repository(client=clients.a,after?:()=>Promise<void>){const uid=client.auth.currentUser!.uid;return createCadastrosRepository(client.db,{uid,atual:()=>client.auth.currentUser?.uid===uid,hoje:day},after)}
async function inventoried(c:Colecao,dados:DadosCadastro,tipo:'criar'|'editar'|'arquivar'='criar',id:string=crypto.randomUUID(),version=0):Promise<ComandoCadastro>{
 const uid=clients.a.auth.currentUser!.uid
 const command={contractVersion:1,operationKey:crypto.randomUUID(),colecao:c,cadastroId:id,expectedVersion:version,tipo,dados} as ComandoCadastro
 if(tipo==='criar'){
  if((await getDocFromServer(doc(clients.a.db,'users',uid,c,id))).exists())throw Error('PREEXISTING_FIXTURE')
  recordFixture(clients.scope,`users/${uid}/${c}/${id}`,uid)
 }
 recordFixture(clients.scope,`users/${uid}/operacoesCadastros/${descrever(command).reciboId}`,uid)
 return command
}
it('CRUD completo e recibos pelo repositório concreto',async()=>{
 for(const c of ['titulares','categorias','contas','etiquetas'] as const){
  const base:DadosCadastro={nome:'Fixture '+clients.scope.runId,estado:'ativo',...(c==='categorias'?{natureza:'despesa' as const}:{}),...(c==='contas'?{tipo:'carteira' as const}:{})}
  const command=await inventoried(c,base),repo=repository()
  // Drop only the response after a real commit, not the persisted effects.
  expect((await repository(clients.a,async()=>{throw Error('lost response')}).executar(command)).ok).toBe(true)
  expect((await repo.executar(command)).ok).toBe(true)
  const edit=await inventoried(c,{...base,nome:base.nome+' editado'},'editar',command.cadastroId,1)
  expect((await repo.executar(edit)).ok).toBe(true)
  const replay=await repo.executar(command);expect(replay.ok&&replay.valor.version).toBe(1)
  const changed=await repo.executar({...command,dados:{...command.dados,nome:'Diferente'}} as ComandoCadastro)
  expect(!changed.ok&&changed.erro.codigo).toBe('conflitoIdempotencia')
  const queried=await repo.consultarOperacao({modo:'descritor',descritor:descrever(command)})
  expect(queried.ok&&queried.valor.estado==='confirmado'&&queried.valor.verificacao).toBe('descritor')
  const archive=await inventoried(c,{...edit.dados,estado:'arquivado'},'arquivar',command.cadastroId,2)
  expect((await repo.executar(archive)).ok).toBe(true)
  const loaded=await repo.obter(c,command.cadastroId);expect(loaded.ok&&loaded.valor.dados.estado).toBe('arquivado')
  await denied(deleteDoc(doc(clients.a.db,'users',clients.scope.uids[0],c,command.cadastroId)))
 }
},120000)
it('nega CRUD direto entre UIDs e em primeiro acesso, sem bypass admin',async()=>{
 const uid=clients.scope.uids[0]
 for(const client of [clients.b,clients.visitor,clients.admin,clients.pending]) for(const c of ['titulares','categorias','contas','etiquetas']){
  const id=crypto.randomUUID(),r=doc(client.db,'users',uid,c,id)
  recordFixture(clients.scope,`users/${uid}/${c}/${id}`,uid)
  await denied(getDocFromServer(r));await denied(getDocsFromServer(query(collection(client.db,'users',uid,c),limit(1))))
  await denied(setDoc(r,{nome:'Indevido',estado:'ativo',schemaVersion:1,version:1,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}))
  await denied(updateDoc(r,{nome:'Outro'}));await denied(updateDoc(r,{estado:'arquivado'}));await denied(deleteDoc(r))
 }
 for(const client of [clients.visitor,clients.b,clients.admin])for(const c of ['operacoesCadastros','usoCadastros'])await denied(getDocFromServer(doc(client.db,'users',uid,c,'negado')))
 for(const c of ['titulares','categorias','contas','etiquetas'])await denied(getDocsFromServer(query(collection(clients.pending.db,'users',clients.pending.auth.currentUser!.uid,c),limit(1))))
},120000)
it('reciprocidade exige par válido; campos e referências adulterados são negados',async()=>{
 const uid=clients.scope.uids[0],c=await inventoried('contas',{nome:'Conta',estado:'ativo',tipo:'banco'})
 const target=doc(clients.a.db,'users',uid,'contas',c.cadastroId),receipt=doc(clients.a.db,'users',uid,'operacoesCadastros',descrever(c).reciboId)
 const data={...c.dados,schemaVersion:1,version:1,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}
 const r={schemaVersion:1,operationKey:c.operationKey,colecao:c.colecao,cadastroId:c.cadastroId,expectedVersion:0,version:1,tipo:'criar',dados:c.dados,createdAt:serverTimestamp()}
 await denied(setDoc(target,data));await denied(setDoc(receipt,r))
 for(const patch of [{schemaVersion:2},{createdAt:Timestamp.fromMillis(0)},{updatedAt:Timestamp.fromMillis(0)},{uid:'B'},{saldoConfirmado:true},{senhaBancaria:'ficticia'},{nome:null},{version:1.5},{tipo:'outro'},{titularId:'users/B/titulares/id'},{titularId:crypto.randomUUID()},{saldoInicialCentavos:0}]){
  const b=writeBatch(clients.a.db),payload={...data,...patch}
  const content={...c.dados,...patch};delete (content as Record<string,unknown>).version
  b.set(target,payload);b.set(receipt,{...r,dados:content});await denied(b.commit())
 }
},120000)
it('preserva titular arquivado no vínculo antigo e impede novo vínculo e lote obsoleto',async()=>{
 const repo=repository(),holder=await inventoried('titulares',{nome:'Titular',estado:'ativo'})
 expect((await repo.executar(holder)).ok).toBe(true)
 const account=await inventoried('contas',{nome:'Conta',estado:'ativo',tipo:'carteira',titularId:holder.cadastroId});expect((await repo.executar(account)).ok).toBe(true)
 const archive=await inventoried('titulares',{...holder.dados,estado:'arquivado'},'arquivar',holder.cadastroId,1);expect((await repo.executar(archive)).ok).toBe(true)
 const edit=await inventoried('contas',{...account.dados,nome:'Renomeada'},'editar',account.cadastroId,1);expect((await repo.executar(edit)).ok).toBe(true)
 await denied(deleteDoc(doc(clients.a.db,'users',clients.scope.uids[0],'titulares',holder.cadastroId)))
 const back=await inventoried('titulares',{nome:'Reativação indevida',estado:'ativo'},'editar',holder.cadastroId,2)
 const previous=await getDocFromServer(doc(clients.a.db,'users',clients.scope.uids[0],'titulares',holder.cadastroId))
 const attempt=writeBatch(clients.a.db);rawPair(attempt,back,previous.data()!.createdAt);await denied(attempt.commit())
 const fresh=await inventoried('contas',account.dados);const fail=await repo.executar(fresh);expect(!fail.ok&&fail.erro.codigo).toBe('referenciaInvalida')
 const page=await repo.listar('contas','todos',1);expect(page.ok&&page.valor.itens.length).toBe(1)
 if(page.ok&&page.valor.cursor){const next=await repo.listar('contas','todos',1,page.valor.cursor);expect(next.ok&&next.valor.itens[0]?.id).not.toBe(page.valor.itens[0].id)}
},120000)
it('base com zero difere de ausência e não permite flags de confirmação',async()=>{
 const repo=repository(),command=await inventoried('contas',{nome:'Base manual',estado:'ativo',tipo:'banco',saldoInicialCentavos:0,saldoInicialPosicao:'credora',saldoInicialDataBase:day()})
 expect((await repo.executar(command)).ok).toBe(true)
 const loaded=await repo.obter('contas',command.cadastroId);expect(loaded.ok&&loaded.valor.dados.saldoInicialCentavos).toBe(0)
 recordFixture(clients.scope,`users/${clients.scope.uids[0]}/usoCadastros/contas__${command.cadastroId}`,clients.scope.uids[0])
 const control=doc(clients.a.db,'users',clients.scope.uids[0],'usoCadastros',`contas__${command.cadastroId}`)
 await denied(setDoc(control,{schemaVersion:1}));await denied(deleteDoc(control))
})
import type { WriteBatch } from 'firebase/firestore'
function rawPair(batch:WriteBatch,c:ComandoCadastro,createdAt:unknown=serverTimestamp(),client=clients.a){
 const uid=client.auth.currentUser!.uid
 batch.set(doc(client.db,'users',uid,c.colecao,c.cadastroId),{...c.dados,schemaVersion:1,version:c.expectedVersion+1,createdAt,updatedAt:serverTimestamp(),...(c.tipo==='arquivar'?{archivedAt:serverTimestamp()}:{})})
 batch.set(doc(client.db,'users',uid,'operacoesCadastros',descrever(c).reciboId),{schemaVersion:1,operationKey:c.operationKey,colecao:c.colecao,cadastroId:c.cadastroId,expectedVersion:c.expectedVersion,version:c.expectedVersion+1,tipo:c.tipo,dados:c.dados,createdAt:serverTimestamp()})
}
it('getAfter nega criar vínculo enquanto arquiva alvo no mesmo lote',async()=>{
 const holder=await inventoried('titulares',{nome:'Alvo concorrente',estado:'ativo'});expect((await repository().executar(holder)).ok).toBe(true)
 const before=await getDocFromServer(doc(clients.a.db,'users',clients.scope.uids[0],'titulares',holder.cadastroId))
 const archive=await inventoried('titulares',{...holder.dados,estado:'arquivado'},'arquivar',holder.cadastroId,1)
 const account=await inventoried('contas',{nome:'Vínculo obsoleto',estado:'ativo',tipo:'banco',titularId:holder.cadastroId})
 const batch=writeBatch(clients.a.db);rawPair(batch,archive,before.data()!.createdAt);rawPair(batch,account);await denied(batch.commit())
 expect((await getDocFromServer(doc(clients.a.db,'users',clients.scope.uids[0],'contas',account.cadastroId))).exists()).toBe(false)
})
it('IDs iguais nos dois UIDs resolvem somente titular do próprio UID',async()=>{
 const holder=await inventoried('titulares',{nome:'Titular A',estado:'ativo'});expect((await repository().executar(holder)).ok).toBe(true)
 const uidB=clients.b.auth.currentUser!.uid
 if((await getDocFromServer(doc(clients.b.db,'users',uidB,'titulares',holder.cadastroId))).exists())throw Error('PREEXISTING_FIXTURE')
 recordFixture(clients.scope,`users/${uidB}/titulares/${holder.cadastroId}`,uidB)
 recordFixture(clients.scope,`users/${uidB}/operacoesCadastros/${descrever(holder).reciboId}`,uidB)
 expect((await repository(clients.b).executar({...holder,colecao:'titulares',dados:{nome:'Titular B',estado:'ativo'}})).ok).toBe(true)
 const archive=await inventoried('titulares',{...holder.dados,estado:'arquivado'},'arquivar',holder.cadastroId,1);await repository().executar(archive)
 const account=await inventoried('contas',{nome:'Não usar B',estado:'ativo',tipo:'banco',titularId:holder.cadastroId})
 const batch=writeBatch(clients.a.db);rawPair(batch,account);await denied(batch.commit())
})
it('cliente direto não contorna data-base, trio ou zero devedor',async()=>{
 for(const patch of [
  {saldoInicialCentavos:0,saldoInicialPosicao:'devedora',saldoInicialDataBase:day()},
  {saldoInicialCentavos:1,saldoInicialPosicao:'credora',saldoInicialDataBase:'9999-12-31'},
  {saldoInicialCentavos:1,saldoInicialPosicao:'credora',saldoInicialDataBase:'2100-02-29'},
  {saldoInicialCentavos:1.5,saldoInicialPosicao:'credora',saldoInicialDataBase:day()}
 ] as const){
  const c=await inventoried('contas',{nome:'Base inválida',estado:'ativo',tipo:'carteira',...patch})
  const batch=writeBatch(clients.a.db);rawPair(batch,c);await denied(batch.commit())
 }
})
import { requireFixture } from './support/manifest'
const usedIds=()=>({categorias:process.env.TEST_CADASTROS_USED_CATEGORY_ID,contas:process.env.TEST_CADASTROS_USED_ACCOUNT_ID})
it.skipIf(process.env.TEST_CADASTROS_PREPARE!=='yes')('prepara cadastros para controles operacionais inventariados',async()=>{
 for(const [c,id] of Object.entries(usedIds())){
  if(!id)throw Error('USED_FIXTURE_ID_REQUIRED')
  const dados:DadosCadastro={nome:'Fixture primeiro uso',estado:'ativo',...(c==='categorias'?{natureza:'despesa' as const}:{tipo:'banco' as const})}
  const command=await inventoried(c as Colecao,dados,'criar',id)
  expect((await repository().executar(command)).ok).toBe(true)
  recordFixture(clients.scope,`users/${clients.scope.uids[0]}/usoCadastros/${c}__${id}`,clients.scope.uids[0])
 }
})
it('controles operacionais preservam bloqueio remoto após primeiro uso',async()=>{
 for(const [c,id] of Object.entries(usedIds())){
  if(!id)throw Error('Controle de primeiro uso não preparado: ver quickstart da feature 004')
  const path=`users/${clients.scope.uids[0]}/usoCadastros/${c}__${id}`
  requireFixture(clients.scope,path)
  if(!(await getDocFromServer(doc(clients.a.db,path))).exists())throw Error('USED_CONTROL_REQUIRED')
  const before=await getDocFromServer(doc(clients.a.db,'users',clients.scope.uids[0],c,id))
  const d=before.data()!;const payload:DadosCadastro={nome:d.nome,estado:d.estado,...(c==='categorias'?{natureza:d.natureza==='receita'?'despesa':'receita'}:{tipo:d.tipo==='banco'?'carteira':'banco'})}
  const cmd=await inventoried(c as Colecao,payload,'editar',id,d.version)
  const batch=writeBatch(clients.a.db);rawPair(batch,cmd,d.createdAt);await denied(batch.commit())
  const ref=doc(clients.a.db,path);await denied(deleteDoc(ref));await denied(updateDoc(ref,{schemaVersion:2}))
 }
})
it('primeiro acesso pendente não permite nem o próprio par cadastro/recibo',async()=>{
 const client=clients.pending,uid=client.auth.currentUser!.uid
 for(const c of ['titulares','categorias','contas','etiquetas'] as const){
  const command={contractVersion:1,operationKey:crypto.randomUUID(),colecao:c,cadastroId:crypto.randomUUID(),expectedVersion:0,tipo:'criar',dados:{nome:'Fixture pendente',estado:'ativo',...(c==='categorias'?{natureza:'despesa'}:c==='contas'?{tipo:'carteira'}:{})}} as ComandoCadastro
  recordFixture(clients.scope,`users/${uid}/${c}/${command.cadastroId}`,uid)
  recordFixture(clients.scope,`users/${uid}/operacoesCadastros/${descrever(command).reciboId}`,uid)
  await denied(getDocFromServer(doc(client.db,'users',uid,c,command.cadastroId)))
  const batch=writeBatch(client.db);rawPair(batch,command,serverTimestamp(),client);await denied(batch.commit())
 }
},120000)
