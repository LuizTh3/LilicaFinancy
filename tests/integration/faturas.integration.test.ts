import { afterAll, beforeAll, expect, it } from 'vitest'
import { collection, deleteDoc, doc, getDocFromServer, getDocsFromServer, limit, query, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { integrationClients } from './support/clients'
import { recordFixture } from './support/manifest'
import { createCadastrosRepository } from '../../src/infrastructure/firebase/cadastrosRepository'
import { createCartoesRepository } from '../../src/infrastructure/firebase/cartoesRepository'
import { createFaturasRepository } from '../../src/infrastructure/firebase/faturasRepository'
import { createFaturasQueries } from '../../src/infrastructure/firebase/faturasQueries'
import { calendarioBaseFatura } from '../../src/domain/finance/invoiceCalendar'
import type { CalendarioFaturaV2 } from '../../src/domain/finance/invoiceCalendar'
import { dadosFatura } from '../../src/domain/finance/faturas'
let clients:Awaited<ReturnType<typeof integrationClients>>,holder:string,uid:string
const key=()=>crypto.randomUUID(),ctx=()=>({uid,generation:1,atual:()=>true})
function inventory(collectionName:string,id:string){recordFixture(clients.scope,`users/${uid}/${collectionName}/${id}`,uid)}
beforeAll(async()=>{clients=await integrationClients();uid=clients.a.auth.currentUser!.uid;holder=key();inventory('titulares',holder);inventory('operacoesCadastros',`titulares__${holder}__1`);expect((await createCadastrosRepository(clients.a.db,{uid,atual:()=>true,hoje:()=> '2026-10-18'}).executar({contractVersion:1,tipo:'criar',colecao:'titulares',cadastroId:holder,operationKey:key(),expectedVersion:0,dados:{nome:'Titular fictício faturas006',estado:'ativo'}})).ok).toBe(true)})
afterAll(async()=>{await clients?.close()})
async function newCard(close=10,due=17){const id=key(),operationKey=key(),repo=createCartoesRepository(clients.a.db,ctx()),payload={banco:'Banco fictício',nome:'Cartão fictício',titularId:holder,diaFechamento:close,diaVencimento:due};inventory('cartoes',id);inventory('operacoesCartoes',`criarCartao__${operationKey}`);expect((await repo.executar({contractVersion:1,tipo:'criarCartao',operationKey,alvoId:id,expectedVersion:0,payload})).ok).toBe(true);return {id,repo,payload}}
function calendar(month:string,close=10,due=17,version=1){const r=calendarioBaseFatura(month,close,due,version);if(!r.ok)throw Error('fixture');return r.valor}
function confirmCommand(id:string,cal:CalendarioFaturaV2){const operationKey=key(),alvoId=`${id}__${cal.competencia}`;inventory('faturas',alvoId);inventory('operacoesFaturas',`confirmarFatura__${operationKey}`);return {contractVersion:1 as const,tipo:'confirmarFatura' as const,operationKey,alvoId,expectedVersion:0,payload:{...cal,cartaoId:id,cartaoVersion:cal.calendarioOrigem.cartaoVersion}}}
function addPair(batch:ReturnType<typeof writeBatch>,id:string,cal:CalendarioFaturaV2,patch:Record<string,unknown>={}){const c=confirmCommand(id,cal),event=`confirmarFatura__${c.operationKey}`,data=dadosFatura(c.payload);batch.set(doc(clients.a.db,'users',uid,'faturas',c.alvoId),{...data,schemaVersion:1,versaoConteudo:1,version:1,ultimoEventoId:event,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),...patch});batch.set(doc(clients.a.db,'users',uid,'operacoesFaturas',event),{schemaVersion:1,contractVersion:1,tipo:c.tipo,operationKey:c.operationKey,alvoId:c.alvoId,expectedVersion:0,resultVersion:1,comando:c,resultado:data,createdAt:serverTimestamp()});return c}
async function change(c:Awaited<ReturnType<typeof newCard>>,close:number,due:number){const operationKey=key();inventory('operacoesCartoes',`editarCartao__${operationKey}`);expect((await c.repo.executar({contractVersion:1,tipo:'editarCartao',operationKey,alvoId:c.id,expectedVersion:1,payload:{...c.payload,diaFechamento:close,diaVencimento:due}})).ok).toBe(true)}
it('confirma identidade única concorrente, existente sem recibo novo, calendário histórico e prévia sem escrita',async()=>{
 const c=await newCard(),repo=createFaturasRepository(clients.a.db,ctx()),queries=createFaturasQueries(clients.a.db,ctx()),a=confirmCommand(c.id,calendar('2026-10')),b=confirmCommand(c.id,calendar('2026-10'))
 const results=await Promise.all([repo.executar(a),repo.executar(b)])
 expect(results.every(r=>r.ok)).toBe(true);expect(results.filter(r=>r.ok&&r.valor.estado==='confirmado')).toHaveLength(1);expect(results.filter(r=>r.ok&&r.valor.estado==='existente')).toHaveLength(1)
 const loser=results[0].ok&&results[0].valor.estado==='existente'?a:b
 expect((await getDocFromServer(doc(clients.a.db,'users',uid,'operacoesFaturas',`confirmarFatura__${loser.operationKey}`))).exists()).toBe(false)
 expect(await queries.prever(c.id,'2026-10-10')).toMatchObject({ok:true,valor:{calendario:{competencia:'2026-11'}}})
 expect(await queries.prever(c.id,'2026-10-10','2027-01')).toMatchObject({ok:true,valor:{estado:'escolhaExplicita',calendario:{competencia:'2027-01'}}})
 expect((await repo.listar({cartaoId:c.id,inicio:'2026-01',fim:'2027-12'}))).toMatchObject({ok:true,valor:{itens:[{competencia:'2026-10'}]}})
 await change(c,12,19)
 expect(await repo.obter(c.id,'2026-10')).toMatchObject({ok:true,valor:{fechamento:'2026-10-10',vencimento:'2026-10-17'}})
 expect(await queries.prever(c.id,'2026-10-10')).toMatchObject({ok:true,valor:{calendario:{competencia:'2026-11',inicio:'2026-10-10'}}})
 const november=await queries.periodo(c.id,'2026-11');expect(november).toMatchObject({ok:true,valor:{calendario:{inicio:'2026-10-10',fechamento:'2026-11-12'}}})
 if(!november.ok||!november.valor.calendario)throw Error('fixture')
 expect((await repo.executar(confirmCommand(c.id,november.valor.calendario))).ok).toBe(true)
})
it('prévia atravessa dezembro/janeiro e igualdade de fevereiro continua apenas calendário, sem pagamento',async()=>{
 const c=await newCard(25,5),q=createFaturasQueries(clients.a.db,ctx()),repo=createFaturasRepository(clients.a.db,ctx())
 expect(await q.prever(c.id,'2026-12-25')).toMatchObject({ok:true,valor:{calendario:{competencia:'2027-02',inicio:'2026-12-25',fechamento:'2027-01-25'}}})
 const feb=await newCard(30,31),f=confirmCommand(feb.id,calendar('2027-02',30,31));expect((await repo.executar(f)).ok).toBe(true)
 const result=await repo.obter(feb.id,'2027-02');expect(result).toMatchObject({ok:true,valor:{fechamento:'2027-02-28',vencimento:'2027-02-28'}})
 if(!result.ok)throw Error('fixture');expect(result.valor).not.toHaveProperty('pago');expect(result.valor).not.toHaveProperty('total')
})
it('nega origem circular12/10 mas aceita lote padrão10/10, com recibos recíprocos',async()=>{
 const c=await newCard(),bad=writeBatch(clients.a.db),oct=calendar('2026-10'),nov=calendar('2026-11')
 addPair(bad,c.id,{...oct,fechamento:'2026-10-12' as typeof oct.fechamento,calendarioOrigem:{...oct.calendarioOrigem,origemFechamento:'vizinhoConfirmado'}})
 addPair(bad,c.id,{...nov,inicio:'2026-10-12' as typeof nov.inicio,calendarioOrigem:{...nov.calendarioOrigem,origemInicio:'vizinhoConfirmado'}})
 await expect(bad.commit()).rejects.toHaveProperty('code','permission-denied')
 const good=writeBatch(clients.a.db);addPair(good,c.id,oct);addPair(good,c.id,nov);await good.commit()
})
it('nega distância2 com datas válidas nas duas ordens de confirmação',async()=>{
 for(const reverse of [false,true]){const c=await newCard(reverse?25:30,reverse?5:31),repo=createFaturasRepository(clients.a.db,ctx());expect((await repo.executar(confirmCommand(c.id,reverse?calendar('2026-12',25,5):calendar('2026-10',30,31)))).ok).toBe(true);await change(c,reverse?30:25,reverse?31:5);const bad=writeBatch(clients.a.db);addPair(bad,c.id,reverse?calendar('2026-10',30,31,2):calendar('2026-12',25,5,2));await expect(bad.commit()).rejects.toHaveProperty('code','permission-denied')}
})
it('nega campos/snapshots/identidade extras e escrita isolada; limites máximos com quatro vizinhos',async()=>{
 const c=await newCard(),repo=createFaturasRepository(clients.a.db,ctx()),q=createFaturasQueries(clients.a.db,ctx())
 for(const month of ['2026-08','2026-09','2026-11','2026-12']){const p=await q.periodo(c.id,month);if(!p.ok||!p.valor.calendario)throw Error('fixture');expect((await repo.executar(confirmCommand(c.id,p.valor.calendario))).ok).toBe(true)}
 const p=await q.periodo(c.id,'2026-10');if(!p.ok||!p.valor.calendario)throw Error('fixture');expect((await repo.executar(confirmCommand(c.id,p.valor.calendario))).ok).toBe(true)
 for(const patch of [{itens:[]},{total:0},{pago:true},{ciclo:'fechada'},{uid:'other'},{schemaVersion:2},{cartaoId:key()},{competencia:'2027-02'}]){const batch=writeBatch(clients.a.db);addPair(batch,c.id,calendar('2027-01'),patch);await expect(batch.commit()).rejects.toHaveProperty('code','permission-denied')}
 const target=doc(clients.a.db,'users',uid,'faturas',`${c.id}__2026-10`);await expect(updateDoc(target,{vencimento:'2026-10-19',version:2,updatedAt:serverTimestamp()})).rejects.toHaveProperty('code','permission-denied');await expect(deleteDoc(target)).rejects.toHaveProperty('code','permission-denied')
})
it('ajuste é atômico, imutável e concorrente; arquivamento conserva consultas/ajustes mas nega período novo',async()=>{
 const c=await newCard(),repo=createFaturasRepository(clients.a.db,ctx()),original=confirmCommand(c.id,calendar('2026-10'));expect((await repo.executar(original)).ok).toBe(true)
 const adjust=(date:string)=>{const operationKey=key();inventory('operacoesFaturas',`ajustarVencimento__${operationKey}`);return {contractVersion:1 as const,tipo:'ajustarVencimento' as const,operationKey,alvoId:original.alvoId,expectedVersion:1,payload:{vencimento:date,motivo:'Emissor fictício confirmou'}}}
 const bad=adjust('2026-11-19');expect((await repo.executar(bad)).ok).toBe(false)
 const outcomes=await Promise.all([repo.executar(adjust('2026-10-19')),repo.executar(adjust('2026-10-20'))]);expect(outcomes.filter(r=>r.ok)).toHaveLength(1);expect(outcomes.filter(r=>!r.ok&&r.erro.codigo==='conflitoVersao'),JSON.stringify(outcomes.map(r=>r.ok?'confirmado':r.erro.codigo))).toHaveLength(1)
 const archiveKey=key();inventory('operacoesCartoes',`arquivarCartao__${archiveKey}`);expect((await c.repo.executar({contractVersion:1,tipo:'arquivarCartao',operationKey:archiveKey,alvoId:c.id,expectedVersion:1,payload:{}})).ok).toBe(true)
 expect((await repo.executar(original)).ok).toBe(true)
 const nextAdjust={...adjust('2026-10-21'),expectedVersion:2};expect((await repo.executar(nextAdjust)).ok).toBe(true)
 expect(await createFaturasQueries(clients.a.db,ctx()).prever(c.id,'2026-10-10')).toMatchObject({ok:false,erro:{codigo:'referenciaInvalida'}})
 const batch=writeBatch(clients.a.db);addPair(batch,c.id,calendar('2026-11'));await expect(batch.commit()).rejects.toHaveProperty('code','permission-denied')
 const target=doc(clients.a.db,'users',uid,'cartoes',c.id);await expect(updateDoc(target,{estado:'ativo'})).rejects.toHaveProperty('code','permission-denied');await expect(deleteDoc(target)).rejects.toHaveProperty('code','permission-denied')
})
it('nega get/list/create/update/delete de faturas e eventos a B/ADMIN/PENDING/visitante',async()=>{
 const c=await newCard(),repo=createFaturasRepository(clients.a.db,ctx()),command=confirmCommand(c.id,calendar('2026-10'));expect((await repo.executar(command)).ok).toBe(true)
 for(const client of [clients.b,clients.admin,clients.pending,clients.visitor])for(const [name,id] of [['faturas',command.alvoId],['operacoesFaturas',`confirmarFatura__${command.operationKey}`]]){const target=doc(client.db,'users',uid,name,id);await expect(getDocFromServer(target)).rejects.toHaveProperty('code','permission-denied');await expect(getDocsFromServer(query(collection(client.db,'users',uid,name),limit(1)))).rejects.toHaveProperty('code','permission-denied');await expect(setDoc(target,{})).rejects.toHaveProperty('code','permission-denied');await expect(updateDoc(target,{version:99})).rejects.toHaveProperty('code','permission-denied');await expect(deleteDoc(target)).rejects.toHaveProperty('code','permission-denied')}
})
it('ataques diretos de ajuste não mudam identidade, limites, snapshot ou campos financeiros',async()=>{
 const c=await newCard(),repo=createFaturasRepository(clients.a.db,ctx()),command=confirmCommand(c.id,calendar('2026-10'));expect((await repo.executar(command)).ok).toBe(true)
 const target=doc(clients.a.db,'users',uid,'faturas',command.alvoId),before=(await getDocFromServer(target)).data()!
 for(const patch of [{vencimento:'2026-11-19'},{vencimento:'2026-10-09'},{vencimento:'2026-10-10'},{inicio:'2026-09-11'},{fechamento:'2026-10-11'},{competencia:'2026-11'},{cartaoId:key()},{calendarioOrigem:{...command.payload.calendarioOrigem,diaFechamento:11}},{versaoConteudo:2},{total:0},{itens:[]},{createdAt:serverTimestamp()}]){
  const operationKey=key(),event=`ajustarVencimento__${operationKey}`,after={...before,vencimento:'2026-10-19',...patch},payload={vencimento:after.vencimento,motivo:'Teste direto fictício'},comando={contractVersion:1,tipo:'ajustarVencimento',operationKey,alvoId:command.alvoId,expectedVersion:1,payload}
  inventory('operacoesFaturas',event);const batch=writeBatch(clients.a.db)
  batch.set(target,{...after,version:2,ultimoEventoId:event,updatedAt:serverTimestamp()})
  batch.set(doc(clients.a.db,'users',uid,'operacoesFaturas',event),{schemaVersion:1,contractVersion:1,operationKey,tipo:'ajustarVencimento',alvoId:command.alvoId,expectedVersion:1,resultVersion:2,comando,resultado:{cartaoId:after.cartaoId,competencia:after.competencia,inicio:after.inicio,fechamento:after.fechamento,vencimento:after.vencimento,calendarioOrigem:after.calendarioOrigem},antes:{vencimento:before.vencimento},createdAt:serverTimestamp()})
  await expect(batch.commit()).rejects.toHaveProperty('code','permission-denied')
 }
 const orphan=`ajustarVencimento__${key()}`;inventory('operacoesFaturas',orphan);await expect(setDoc(doc(clients.a.db,'users',uid,'operacoesFaturas',orphan),{alvoId:command.alvoId})).rejects.toHaveProperty('code','permission-denied')
 await expect(updateDoc(target,{version:2,vencimento:'2026-10-19',ultimoEventoId:`confirmarFatura__${command.operationKey}`,updatedAt:serverTimestamp()})).rejects.toHaveProperty('code','permission-denied')
 expect(await repo.obter(c.id,'2026-10')).toMatchObject({ok:true,valor:{version:1,vencimento:'2026-10-17'}})
})
