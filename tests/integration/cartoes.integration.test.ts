import { afterAll, beforeAll, expect, it } from 'vitest'
import { collection, doc, getDocFromServer, getDocsFromServer, limit, query, serverTimestamp, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore'
import { integrationClients } from './support/clients'
import { recordFixture } from './support/manifest'
import { createCadastrosRepository } from '../../src/infrastructure/firebase/cadastrosRepository'
import { createCartoesRepository } from '../../src/infrastructure/firebase/cartoesRepository'
import type { ComandoCartao } from '../../src/domain/finance/contracts/cartoes'
let clients:Awaited<ReturnType<typeof integrationClients>>
const id=()=>crypto.randomUUID()
let holder:string,otherHolder:string,command:Extract<ComandoCartao,{tipo:'criarCartao'|'editarCartao'}>
const context=(uid:string)=>({uid,generation:1,atual:()=>true})
beforeAll(async()=>{
 clients=await integrationClients()
 holder=id();otherHolder=id()
 for(const [client,holderId] of [[clients.a,holder],[clients.b,otherHolder]] as const){
  const uid=client.auth.currentUser!.uid,operationKey=id()
  recordFixture(clients.scope,`users/${uid}/titulares/${holderId}`,uid)
  recordFixture(clients.scope,`users/${uid}/operacoesCadastros/titulares__${holderId}__1`,uid)
  const result=await createCadastrosRepository(client.db,{uid,atual:()=>true,hoje:()=> '2026-10-18'}).executar({contractVersion:1,operationKey,cadastroId:holderId,expectedVersion:0,colecao:'titulares',tipo:'criar',dados:{nome:'Titular fictício006',estado:'ativo'}})
  expect(result.ok).toBe(true)
 }
 command={contractVersion:1,tipo:'criarCartao',alvoId:id(),operationKey:id(),expectedVersion:0,payload:{banco:'Banco fictício',nome:'Cartão fictício',titularId:holder,diaFechamento:10,diaVencimento:17}}
})
afterAll(async()=>{await clients?.close()})
function inventory(c:ComandoCartao){const uid=clients.a.auth.currentUser!.uid;recordFixture(clients.scope,`users/${uid}/cartoes/${c.alvoId}`,uid);recordFixture(clients.scope,`users/${uid}/operacoesCartoes/${c.tipo}__${c.operationKey}`,uid)}
it('confirma criação/edição com recibo e replay sem duplicar, preservando dois cartões de nomes iguais',async()=>{
 const uid=clients.a.auth.currentUser!.uid,repo=createCartoesRepository(clients.a.db,context(uid));inventory(command)
 const first=await repo.executar(command);expect(first.ok).toBe(true)
 expect(await repo.executar(command)).toEqual(first)
 const second={...command,alvoId:id(),operationKey:id()};inventory(second);expect((await repo.executar(second)).ok).toBe(true)
 const edit:ComandoCartao={...command,tipo:'editarCartao',operationKey:id(),expectedVersion:1,payload:{...command.payload,nome:'Nome corrigido'}};inventory(edit)
 expect((await repo.executar(edit)).ok).toBe(true)
 expect((await repo.obter(command.alvoId))).toMatchObject({ok:true,valor:{nome:'Nome corrigido',version:2}})
 expect(await repo.executar(command)).toEqual(first)
 expect(await repo.executar({...command,payload:{...command.payload,nome:'Outro'}})).toMatchObject({ok:false,erro:{codigo:'conflitoIdempotencia'}})
})
it('nega papéis indevidos em get/list/create/update/delete sem bypass administrativo',async()=>{
 const uid=clients.a.auth.currentUser!.uid
 for(const client of [clients.b,clients.admin,clients.pending,clients.visitor]) {
  const target=doc(client.db,'users',uid,'cartoes',command.alvoId)
  await expect(getDocFromServer(target)).rejects.toHaveProperty('code','permission-denied')
  await expect(getDocsFromServer(query(collection(client.db,'users',uid,'cartoes'),limit(1)))).rejects.toHaveProperty('code','permission-denied')
  await expect(setDoc(target,{nome:'Ataque'})).rejects.toHaveProperty('code','permission-denied')
  await expect(updateDoc(target,{nome:'Ataque'})).rejects.toHaveProperty('code','permission-denied')
  await expect(deleteDoc(target)).rejects.toHaveProperty('code','permission-denied')
  const receipt=doc(client.db,'users',uid,'operacoesCartoes',`${command.tipo}__${command.operationKey}`)
  await expect(getDocFromServer(receipt)).rejects.toHaveProperty('code','permission-denied')
  await expect(getDocsFromServer(query(collection(client.db,'users',uid,'operacoesCartoes'),limit(1)))).rejects.toHaveProperty('code','permission-denied')
  await expect(setDoc(receipt,{alvoId:command.alvoId})).rejects.toHaveProperty('code','permission-denied')
  await expect(updateDoc(receipt,{resultVersion:99})).rejects.toHaveProperty('code','permission-denied')
  await expect(deleteDoc(receipt)).rejects.toHaveProperty('code','permission-denied')
 }
 const pendingUid=clients.pending.auth.currentUser!.uid
 await expect(getDocsFromServer(query(collection(clients.pending.db,'users',pendingUid,'cartoes'),limit(1)))).rejects.toHaveProperty('code','permission-denied')
})
it('escrita direta não contorna campos fechados, titular ou grafo recíproco',async()=>{
 const uid=clients.a.auth.currentUser!.uid,card=doc(clients.a.db,'users',uid,'cartoes',command.alvoId)
 const before=(await getDocFromServer(card)).data()!
 for(const patch of [{cvv:'fixture'},{numeroCompleto:'fixture'},{tokenBancario:'fixture'},{uid:'other'},{titularId:otherHolder},{titularId:id()},{diaFechamento:32},{nome:''}]) {
  const operationKey=id(),eventId='editarCartao__'+operationKey,edit={...command,tipo:'editarCartao',operationKey,expectedVersion:before.version,payload:{...command.payload,nome:before.nome,...patch}}
  const target=doc(clients.a.db,'users',uid,'operacoesCartoes',eventId)
  recordFixture(clients.scope,`users/${uid}/operacoesCartoes/${eventId}`,uid)
  const payload={banco:before.banco,nome:before.nome,titularId:before.titularId,diaFechamento:before.diaFechamento,diaVencimento:before.diaVencimento,estado:'ativo',...patch}
  const batch=writeBatch(clients.a.db)
  batch.set(card,{...before,...payload,version:before.version+1,ultimoEventoId:eventId,updatedAt:serverTimestamp()})
  batch.set(target,{schemaVersion:1,contractVersion:1,operationKey,tipo:'editarCartao',alvoId:command.alvoId,expectedVersion:before.version,resultVersion:before.version+1,comando:edit,resultado:payload,antes:{banco:before.banco,nome:before.nome,titularId:before.titularId,diaFechamento:before.diaFechamento,diaVencimento:before.diaVencimento,estado:'ativo'},createdAt:serverTimestamp()})
  await expect(batch.commit()).rejects.toHaveProperty('code','permission-denied')
 }
 await expect(updateDoc(card,{nome:'Sem recibo',version:before.version+1,updatedAt:serverTimestamp()})).rejects.toHaveProperty('code','permission-denied')
 await expect(deleteDoc(card)).rejects.toHaveProperty('code','permission-denied')
 const originalReceipt=doc(clients.a.db,'users',uid,'operacoesCartoes',`criarCartao__${command.operationKey}`)
 await expect(updateDoc(originalReceipt,{resultVersion:before.version+1})).rejects.toHaveProperty('code','permission-denied')
 await expect(deleteDoc(originalReceipt)).rejects.toHaveProperty('code','permission-denied')
 await expect(updateDoc(card,{nome:'Evento reutilizado',version:before.version+1,ultimoEventoId:`criarCartao__${command.operationKey}`,updatedAt:serverTimestamp()})).rejects.toHaveProperty('code','permission-denied')
 const standaloneId='editarCartao__'+id();recordFixture(clients.scope,`users/${uid}/operacoesCartoes/${standaloneId}`,uid)
 await expect(setDoc(doc(clients.a.db,'users',uid,'operacoesCartoes',standaloneId),{schemaVersion:1,alvoId:command.alvoId})).rejects.toHaveProperty('code','permission-denied')
})
it('titular arquivado bloqueia novo cartão e continua válido apenas no vínculo histórico',async()=>{
 const uid=clients.a.auth.currentUser!.uid,holderRepo=createCadastrosRepository(clients.a.db,{uid,atual:()=>true,hoje:()=> '2026-10-18'})
 const archiveKey=id();recordFixture(clients.scope,`users/${uid}/operacoesCadastros/titulares__${holder}__2`,uid)
 expect((await holderRepo.executar({contractVersion:1,tipo:'arquivar',operationKey:archiveKey,cadastroId:holder,colecao:'titulares',expectedVersion:1,dados:{nome:'Titular fictício006',estado:'arquivado'}})).ok).toBe(true)
 const repo=createCartoesRepository(clients.a.db,context(uid)),another={...command,alvoId:id(),operationKey:id()};inventory(another)
 expect(await repo.executar(another)).toMatchObject({ok:false,erro:{codigo:'referenciaInvalida'}})
 const edit:ComandoCartao={...command,tipo:'editarCartao',expectedVersion:2,operationKey:id(),payload:{...command.payload,nome:'Preservado'}};inventory(edit)
 expect((await repo.executar(edit)).ok).toBe(true)
 expect((await repo.executar(command)).ok).toBe(true)
})
it('arquivamento nega edição embutida e formulário obsoleto, preservando cartão do mesmo banco separado',async()=>{
 const uid=clients.a.auth.currentUser!.uid,repo=createCartoesRepository(clients.a.db,context(uid)),original=await repo.obter(command.alvoId)
 if(!original.ok)throw Error('fixture')
 const operationKey=id(),eventId=`arquivarCartao__${operationKey}`,target=doc(clients.a.db,'users',uid,'cartoes',command.alvoId),before=(await getDocFromServer(target)).data()!,beforeBusiness={banco:before.banco,nome:before.nome,titularId:before.titularId,diaFechamento:before.diaFechamento,diaVencimento:before.diaVencimento,estado:'ativo'},result={...beforeBusiness,nome:'Edição embutida',estado:'arquivado'}
 recordFixture(clients.scope,`users/${uid}/operacoesCartoes/${eventId}`,uid)
 const batch=writeBatch(clients.a.db);batch.set(target,{...before,...result,version:before.version+1,ultimoEventoId:eventId,updatedAt:serverTimestamp(),archivedAt:serverTimestamp()});batch.set(doc(clients.a.db,'users',uid,'operacoesCartoes',eventId),{schemaVersion:1,contractVersion:1,tipo:'arquivarCartao',operationKey,alvoId:command.alvoId,expectedVersion:before.version,resultVersion:before.version+1,comando:{contractVersion:1,tipo:'arquivarCartao',operationKey,alvoId:command.alvoId,expectedVersion:before.version,payload:{}},resultado:result,antes:beforeBusiness,createdAt:serverTimestamp()});await expect(batch.commit()).rejects.toHaveProperty('code','permission-denied')
 const archive:ComandoCartao={contractVersion:1,tipo:'arquivarCartao',operationKey:id(),alvoId:command.alvoId,expectedVersion:original.valor.version,payload:{}};inventory(archive)
 expect((await repo.executar(archive)).ok).toBe(true)
 const stale:ComandoCartao={...command,tipo:'editarCartao',operationKey:id(),expectedVersion:original.valor.version,payload:{...command.payload,nome:'Obsoleto'}};inventory(stale);expect(await repo.executar(stale)).toMatchObject({ok:false,erro:{codigo:'conflitoVersao'}})
 await expect(updateDoc(target,{estado:'ativo'})).rejects.toHaveProperty('code','permission-denied');await expect(deleteDoc(target)).rejects.toHaveProperty('code','permission-denied')
 expect((await repo.executar(command)).ok).toBe(true)
 const list=await repo.listar('ativo');expect(list.ok&&list.valor.itens.some(c=>c.id!==command.alvoId&&c.banco===command.payload.banco)).toBe(true)
})
