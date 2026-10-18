import { beforeAll, afterAll, expect, it } from 'vitest'
import { collection, doc, getDocFromServer, getDocsFromServer, limit, query, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { integrationClients } from './support/clients'
import { recordFixture } from './support/manifest'
import { createCadastrosRepository } from '../../src/infrastructure/firebase/cadastrosRepository'
import { descrever } from '../../src/domain/finance/cadastros'
import { createExternosRepository } from '../../src/infrastructure/firebase/externosRepository'
import { hojeNoFuso } from '../../src/domain/finance/calendar'
import type { ComandoCadastro } from '../../src/domain/finance/contracts/cadastros'
import type { ComandoExterno } from '../../src/domain/finance/contracts/externos'
let clients:Awaited<ReturnType<typeof integrationClients>>
const today=()=>{const day=hojeNoFuso(Date.now(),'America/Rio_Branco');if(!day.ok)throw Error('CLOCK');return day.valor}
const denied=(promise:Promise<unknown>)=>expect(promise).rejects.toMatchObject({code:'permission-denied'})
beforeAll(async()=>{
 clients=await integrationClients()
 for(const client of [clients.a,clients.b,clients.admin]){
  const profile=await getDocFromServer(doc(client.db,'users',client.auth.currentUser!.uid))
  const token=await client.auth.currentUser!.getIdTokenResult()
  if(profile.data()?.primeiro_login!==false||profile.data()?.timezone!=='America/Rio_Branco'||Number(token.claims.auth_time)*1000<=profile.data()?.passwordChangeCompletedAt?.toMillis())throw Error('READY_TEST_ACCOUNT_REQUIRED')
 }
 if(!(await getDocFromServer(doc(clients.admin.db,'admins',clients.admin.auth.currentUser!.uid))).data()?.enabled)throw Error('ADMIN_TEST_ROLE_REQUIRED')
 if((await getDocFromServer(doc(clients.pending.db,'users',clients.pending.auth.currentUser!.uid))).data()?.primeiro_login!==true)throw Error('PENDING_TEST_ACCOUNT_REQUIRED')
})
afterAll(async()=>{await clients?.close()})
async function category(natureza:'receita'|'despesa') {
 const uid=clients.a.auth.currentUser!.uid,id=crypto.randomUUID()
 const c:ComandoCadastro={contractVersion:1,tipo:'criar',operationKey:crypto.randomUUID(),cadastroId:id,expectedVersion:0,colecao:'categorias',dados:{nome:'Fixture '+clients.scope.runId,estado:'ativo',natureza}}
 recordFixture(clients.scope,`users/${uid}/categorias/${id}`,uid)
 recordFixture(clients.scope,`users/${uid}/operacoesCadastros/${descrever(c).reciboId}`,uid)
 const result=await createCadastrosRepository(clients.a.db,{uid,atual:()=>true,hoje:today}).executar(c)
 if(!result.ok)throw Error('CATEGORY_FIXTURE_FAILED')
 return id
}
async function cadastro(colecao:'titulares'|'contas'|'etiquetas') {
 const uid=clients.a.auth.currentUser!.uid,id=crypto.randomUUID()
 const c:ComandoCadastro={contractVersion:1,tipo:'criar',operationKey:crypto.randomUUID(),cadastroId:id,expectedVersion:0,colecao,dados:{nome:'Fixture '+clients.scope.runId,estado:'ativo',...(colecao==='contas'?{tipo:'banco'}:{})}} as ComandoCadastro
 recordFixture(clients.scope,`users/${uid}/${colecao}/${id}`,uid)
 recordFixture(clients.scope,`users/${uid}/operacoesCadastros/${descrever(c).reciboId}`,uid)
 const repo=createCadastrosRepository(clients.a.db,{uid,atual:()=>true,hoje:today})
 const result=await repo.executar(c);if(!result.ok)throw Error('CATALOG_FIXTURE_FAILED')
 return {id,command:c,repo}
}
function repository(){const uid=clients.a.auth.currentUser!.uid;return createExternosRepository(clients.a.db,{uid,generation:1,timezone:'America/Rio_Branco',atual:()=>clients.a.auth.currentUser?.uid===uid,token:()=>clients.a.auth.currentUser!.getIdToken(),agora:Date.now})}
it('PENDING não lê sequer seu próprio caminho financeiro antes de concluir primeiro acesso',async()=>{
 const uid=clients.pending.auth.currentUser!.uid
 await denied(getDocFromServer(doc(clients.pending.db,'users',uid,'lancamentosExternos','fixture-ausente')))
 await denied(getDocsFromServer(query(collection(clients.pending.db,'users',uid,'lancamentosExternos'),limit(1))))
 await denied(getDocFromServer(doc(clients.pending.db,'users',uid,'operacoesExternas','criarDespesa__fixture-ausente')))
})
it('valida criação atômica pelo endpoint de commit com token do proprietário',async()=>{
 const uid=clients.a.auth.currentUser!.uid,cat=await category('receita'),id=crypto.randomUUID(),key=crypto.randomUUID(),eventId=`criarReceita__${key}`
 recordFixture(clients.scope,`users/${uid}/lancamentosExternos/${id}`,uid);recordFixture(clients.scope,`users/${uid}/operacoesExternas/${eventId}`,uid)
 const dados={natureza:'receita',descricao:'Fixture REST '+clients.scope.runId,categoriaId:cat,valorCentavos:100,estimado:false,competenciaPlanejamento:'2026-10',dataPrevista:'2026-11-05'}
 const command={contractVersion:1,tipo:'criarReceita',operationKey:key,origemId:id,expectedVersion:0,dados}
 const value=(v:unknown):Record<string,unknown>=>typeof v==='string'?{stringValue:v}:typeof v==='number'?{integerValue:String(v)}:typeof v==='boolean'?{booleanValue:v}:Array.isArray(v)?{arrayValue:{values:v.map(value)}}:{mapValue:{fields:Object.fromEntries(Object.entries(v as Record<string,unknown>).map(([k,x])=>[k,value(x)]))}}
 const fields=(v:Record<string,unknown>)=>Object.fromEntries(Object.entries(v).map(([k,x])=>[k,value(x)]))
 const base=`projects/${clients.scope.projectId}/databases/(default)/documents/users/${uid}`
 const origin={...dados,schemaVersion:1,version:1,estadoObrigacao:'ativa',liquidadoLiquidoCentavos:0,jaLiquidada:false,ultimoEventoId:eventId}
 const event={schemaVersion:1,contractVersion:1,tipo:'criarReceita',operationKey:key,origemId:id,natureza:'receita',expectedVersion:0,resultVersion:1,comando:command,depois:dados}
 const response=await fetch(`https://firestore.googleapis.com/v1/projects/${clients.scope.projectId}/databases/(default)/documents:commit`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await clients.a.auth.currentUser!.getIdToken()},body:JSON.stringify({writes:[
  {update:{name:base+'/lancamentosExternos/'+id,fields:fields(origin)},updateTransforms:['createdAt','updatedAt'].map(fieldPath=>({fieldPath,setToServerValue:'REQUEST_TIME'})),currentDocument:{exists:false}},
  {update:{name:base+'/operacoesExternas/'+eventId,fields:fields(event)},updateTransforms:[{fieldPath:'createdAt',setToServerValue:'REQUEST_TIME'}],currentDocument:{exists:false}},
  {update:{name:base+'/categorias/'+cat,fields:fields({schemaVersion:2,usoFinanceiro:{eventoId:eventId,origemId:id,papel:'classificacao'}})},updateMask:{fieldPaths:['schemaVersion','usoFinanceiro']},updateTransforms:[{fieldPath:'usoFinanceiro.createdAt',setToServerValue:'REQUEST_TIME'}],currentDocument:{exists:true}}
 ]}),signal:AbortSignal.timeout(15000)})
 const result=await response.json() as {error?:{message?:string;status?:string}}
 expect(response.ok,JSON.stringify(result.error??{})).toBe(true)
})
it('cria previsões idempotentes, preserva datas independentes e bloqueia finanças de terceiros',async()=>{
 const uid=clients.a.auth.currentUser!.uid,repo=repository()
 for(const natureza of ['receita','despesa'] as const){
  const id=crypto.randomUUID(),key=crypto.randomUUID(),cat=await category(natureza)
  const dados={natureza,descricao:'Fixture '+clients.scope.runId,categoriaId:cat,valorCentavos:10000,estimado:false,competenciaPlanejamento:'2026-10',...(natureza==='receita'?{dataPrevista:'2026-11-05'}:{vencimento:'2026-11-10',dataConsumo:today()})}
  const c={contractVersion:1,tipo:natureza==='receita'?'criarReceita':'criarDespesa',operationKey:key,origemId:id,expectedVersion:0,dados} as ComandoExterno
  recordFixture(clients.scope,`users/${uid}/lancamentosExternos/${id}`,uid)
  recordFixture(clients.scope,`users/${uid}/operacoesExternas/${c.tipo}__${key}`,uid)
  const first=await repo.executar(c);expect(first.ok,first.ok?'':JSON.stringify(first.erro)).toBe(true)
  expect(await repo.executar(c)).toEqual(first)
  const source=await getDocFromServer(doc(clients.a.db,'users',uid,'lancamentosExternos',id))
  expect(source.data()).toMatchObject({valorCentavos:10000,liquidadoLiquidoCentavos:0,jaLiquidada:false,competenciaPlanejamento:'2026-10'})
  const month=await repo.listar({base:'planejamento',competencia:'2026-10',filtro:{natureza},pageSize:50})
  expect(month.ok).toBe(true)
  if(month.ok)expect(month.valor.itens.some(item=>item.origem.id===id&&item.pendenteCentavos===10000)).toBe(true)
  const detail=await repo.detalhe(id)
  expect(detail.ok).toBe(true)
  if(detail.ok){expect(detail.valor.completo).toBe(true);expect(detail.valor.eventos).toHaveLength(1);expect(detail.valor.eventos[0].id).toBe(`${c.tipo}__${key}`)}
  for(const other of [clients.b,clients.admin,clients.pending,clients.visitor]){
   await denied(getDocFromServer(doc(other.db,'users',uid,'lancamentosExternos',id)))
   await denied(getDocFromServer(doc(other.db,'users',uid,'operacoesExternas',`${c.tipo}__${key}`)))
   await denied(getDocsFromServer(query(collection(other.db,'users',uid,'operacoesExternas'),limit(50))))
   await denied(getDocsFromServer(query(collection(other.db,'users',uid,'lancamentosExternos'),limit(50))))
  }
  const endpoint=`https://firestore.googleapis.com/v1/projects/${clients.scope.projectId}/databases/(default)/documents/users/${uid}:runQuery`
  for(const other of [clients.b,clients.admin,clients.pending,clients.visitor]) {
   const token=await other.auth.currentUser?.getIdToken()
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({structuredQuery:{from:[{collectionId:'lancamentosExternos'}],limit:1}}),signal:AbortSignal.timeout(15000)})
   expect([401,403]).toContain(response.status)
  }
  await denied(setDoc(doc(clients.a.db,'users',uid,'lancamentosExternos',id),{...source.data(),ownerUid:uid}))
 }
})

it('cria o ramo máximo com cinco etiquetas, titular, conta prevista e primeiro uso da categoria',async()=>{
 const uid=clients.a.auth.currentUser!.uid,cat=await category('despesa'),holder=await cadastro('titulares'),account=await cadastro('contas')
 const labels=[] as Awaited<ReturnType<typeof cadastro>>[]
 for(let n=0;n<5;n++)labels.push(await cadastro('etiquetas'))
 const key=crypto.randomUUID(),id=crypto.randomUUID(),repo=repository()
 const command:Extract<ComandoExterno,{tipo:'criarDespesa'}>={contractVersion:1,tipo:'criarDespesa',operationKey:key,origemId:id,expectedVersion:0,dados:{natureza:'despesa',descricao:'Fixture máxima '+clients.scope.runId,categoriaId:cat,titularId:holder.id,contaPrevistaId:account.id,etiquetaIds:labels.map(x=>x.id).sort(),valorCentavos:1,estimado:true,competenciaPlanejamento:'2026-10',vencimento:'2026-11-01',dataConsumo:today()}}
 recordFixture(clients.scope,`users/${uid}/lancamentosExternos/${id}`,uid)
 recordFixture(clients.scope,`users/${uid}/operacoesExternas/criarDespesa__${key}`,uid)
 const first=await repo.executar(command);expect(first.ok,first.ok?'':JSON.stringify(first.erro)).toBe(true);expect(await repo.executar(command)).toEqual(first)
 const categoryDoc=(await getDocFromServer(doc(clients.a.db,'users',uid,'categorias',cat))).data()
 expect(categoryDoc).toMatchObject({schemaVersion:2,version:1,usoFinanceiro:{eventoId:`criarDespesa__${key}`,origemId:id,papel:'classificacao'}})
 expect((await getDocFromServer(doc(clients.a.db,'users',uid,'contas',account.id))).data()).not.toHaveProperty('usoFinanceiro')
 const event=(await getDocFromServer(doc(clients.a.db,'users',uid,'operacoesExternas',`criarDespesa__${key}`))).data()
 expect(event).not.toHaveProperty('fato')

 // Attack the commit directly; bypassing the domain must not bypass Rules.
 const source=(await getDocFromServer(doc(clients.a.db,'users',uid,'lancamentosExternos',id))).data()!
 async function invalidPair(patch:Record<string,unknown>) {
  const badId=crypto.randomUUID(),badKey=crypto.randomUUID(),eventId=`criarDespesa__${badKey}`
  recordFixture(clients.scope,`users/${uid}/lancamentosExternos/${badId}`,uid)
  recordFixture(clients.scope,`users/${uid}/operacoesExternas/${eventId}`,uid)
  const data={...command.dados,...patch};for(const field of Object.keys(data))if(data[field as keyof typeof data]===undefined)delete (data as Record<string,unknown>)[field]
  const business=Object.keys(command.dados)
  const origin={...Object.fromEntries(Object.entries(source).filter(([field])=>!business.includes(field))),...data,ultimoEventoId:eventId,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}
  const batch=writeBatch(clients.a.db)
  batch.set(doc(clients.a.db,'users',uid,'lancamentosExternos',badId),origin)
  batch.set(doc(clients.a.db,'users',uid,'operacoesExternas',eventId),{...event,operationKey:badKey,origemId:badId,comando:{...command,operationKey:badKey,origemId:badId,dados:data},depois:data,createdAt:serverTimestamp()})
  await denied(batch.commit())
  expect((await getDocFromServer(doc(clients.a.db,'users',uid,'lancamentosExternos',badId))).exists()).toBe(false)
 }
 await invalidPair({dataConsumo:undefined})
 await invalidPair({ownerUid:uid})
 // Optional nulls on the origin cannot masquerade as absent fields on the receipt.
 {
  const badId=crypto.randomUUID(),badKey=crypto.randomUUID(),eventId=`criarDespesa__${badKey}`
  recordFixture(clients.scope,`users/${uid}/lancamentosExternos/${badId}`,uid)
  recordFixture(clients.scope,`users/${uid}/operacoesExternas/${eventId}`,uid)
  const batch=writeBatch(clients.a.db)
  batch.set(doc(clients.a.db,'users',uid,'lancamentosExternos',badId),{...source,observacao:null,ultimoEventoId:eventId,createdAt:serverTimestamp(),updatedAt:serverTimestamp()})
  batch.set(doc(clients.a.db,'users',uid,'operacoesExternas',eventId),{...event,operationKey:badKey,origemId:badId,comando:{...command,operationKey:badKey,origemId:badId},createdAt:serverTimestamp()})
  await denied(batch.commit())
 }
 const activeLabels=labels.map(x=>x.id)
 for(const [index,label] of labels.entries()) {
  const archive={...label.command,tipo:'arquivar',operationKey:crypto.randomUUID(),expectedVersion:1,dados:{...label.command.dados,estado:'arquivado'}} as ComandoCadastro
  recordFixture(clients.scope,`users/${uid}/operacoesCadastros/${descrever(archive).reciboId}`,uid)
  expect((await label.repo.executar(archive)).ok).toBe(true)
  await invalidPair({etiquetaIds:[...activeLabels].sort()})
  activeLabels[index]=(await cadastro('etiquetas')).id
 }
})
