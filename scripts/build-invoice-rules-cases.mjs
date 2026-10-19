import fs from 'node:fs'

const time='2026-10-18T21:00:00Z',old='2020-01-01T00:00:00Z'
const path=(c,id)=>`/databases/(default)/documents/users/fixture/${c}/${id}`
const mock=(name,p,v)=>({function:name,args:[{exactValue:p.replace('(default)','%28default%29')}],result:{value:v}})
const profile={uid:'fixture',schemaVersion:1,primeiro_login:false,timezone:'America/Rio_Branco',passwordChangeCompletedAt:old}
const holder={nome:'Fixture',estado:'ativo',schemaVersion:1,version:1,createdAt:old,updatedAt:old}
const baseMocks=[mock('get','/databases/(default)/documents/users/fixture',{data:profile}),mock('getAfter',path('titulares','holder'),{data:holder})]
const biz={banco:'Fixture',nome:'Fixture',titularId:'holder',diaFechamento:10,diaVencimento:17}
const card={...biz,estado:'ativo',schemaVersion:1,version:1,ultimoEventoId:'criarCartao__old',createdAt:old,updatedAt:old}
const cardResult=c=>Object.fromEntries(['banco','nome','titularId','diaFechamento','diaVencimento','estado'].map(k=>[k,c[k]]))
function receipt(tipo,key,id,version,payload,result,before){return {schemaVersion:1,contractVersion:1,tipo,operationKey:key,alvoId:id,expectedVersion:version,resultVersion:version+1,comando:{contractVersion:1,tipo,operationKey:key,alvoId:id,expectedVersion:version,payload},resultado:result,...(before?{antes:before}:{}),createdAt:time}}
const cases=[]
function add(name,c,id,method,data,before,mocks,allow=true){cases.push({name,test:{expectation:allow?'ALLOW':'DENY',request:{path:path(c,id),method,auth:{uid:'fixture',token:{auth_time:1792357200}},time,resource:{data}},...(before?{resource:{data:before}}:{}),functionMocks:[...baseMocks,...mocks],expressionReportLevel:'FULL'}})}
for(const tipo of ['criarCartao','editarCartao','arquivarCartao']){
 const create=tipo==='criarCartao',archive=tipo==='arquivarCartao',event=tipo+'__key',data={...card,...(!create&&!archive?{nome:'Changed'}:{}),estado:archive?'arquivado':'ativo',version:create?1:2,ultimoEventoId:event,createdAt:create?time:old,updatedAt:time,...(archive?{archivedAt:time}:{})}
 const payload=archive?{}:Object.fromEntries(Object.keys(biz).map(k=>[k,data[k]])),r=receipt(tipo,'key','card',create?0:1,payload,cardResult(data),create?undefined:cardResult(card))
 const mocks=[mock('getAfter',path('operacoesCartoes',event),{data:r}),mock('getAfter',path('cartoes','card'),{data})]
 add(tipo,'cartoes','card',create?'create':'update',data,create?undefined:card,mocks)
 add(tipo+'Receipt','operacoesCartoes',event,'create',r,undefined,mocks)
 if(create)add('cardForbiddenField','cartoes','card','create',{...data,cvv:'fixture'},undefined,mocks,false)
}
function month(m,offset){const [y,n]=m.split('-').map(Number),i=y*12+n-1+offset;return `${Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}`}
function date(m,day){const [y,n]=m.split('-').map(Number),max=new Date(Date.UTC(y,n,0)).getUTCDate();return m+'-'+String(Math.min(day,max)).padStart(2,'0')}
function calendar(m,close=10,due=17,v=1){const cm=month(m,close<due?0:-1);return {cartaoId:'card',competencia:m,inicio:date(month(cm,-1),close),fechamento:date(cm,close),vencimento:date(m,due),calendarioOrigem:{calendarVersion:2,cartaoVersion:v,diaFechamento:close,diaVencimento:due,vencimentoOriginal:date(m,due),origemInicio:'padrao',origemFechamento:'padrao'}}}
const stored=b=>({...b,schemaVersion:1,versaoConteudo:1,version:1,ultimoEventoId:'confirmarFatura__old',createdAt:old,updatedAt:old})
function invoicePair(name,b,neighbors={},allow=true,c=card){
 const id='card__'+b.competencia,event='confirmarFatura__'+name,data={...stored(b),ultimoEventoId:event,createdAt:time,updatedAt:time},r=receipt('confirmarFatura',name,id,0,{...b,cartaoVersion:b.calendarioOrigem.cartaoVersion},b)
 const mocks=[mock('getAfter',path('cartoes','card'),{data:c}),mock('getAfter',path('faturas',id),{data}),mock('getAfter',path('operacoesFaturas',event),{data:r}),...[-2,-1,1,2].map(n=>mock('get',path('faturas','card__'+month(b.competencia,n)),neighbors[n]?{data:neighbors[n]}:null))]
 add(name,'faturas',id,'create',data,undefined,mocks,allow)
 if(allow)add(name+'Receipt','operacoesFaturas',event,'create',r,undefined,mocks)
}
invoicePair('invoiceEmpty',calendar('2026-10'))
invoicePair('invoiceMaximum',{...calendar('2026-10'),calendarioOrigem:{...calendar('2026-10').calendarioOrigem,origemInicio:'vizinhoConfirmado',origemFechamento:'vizinhoConfirmado'}},Object.fromEntries([-2,-1,1,2].map(n=>[n,stored(calendar(month('2026-10',n)))])))
invoicePair('circularOctober',{...calendar('2026-10'),fechamento:'2026-10-12',calendarioOrigem:{...calendar('2026-10').calendarioOrigem,origemFechamento:'vizinhoConfirmado'}},{},false)
invoicePair('circularNovember',{...calendar('2026-11'),inicio:'2026-10-12',calendarioOrigem:{...calendar('2026-11').calendarioOrigem,origemInicio:'vizinhoConfirmado'}},{},false)
invoicePair('batchControlOctober',calendar('2026-10'))
invoicePair('batchControlNovember',calendar('2026-11'))
invoicePair('distanceTwo',calendar('2026-12',25,5,2),{'-2':stored(calendar('2026-10',30,31))},false,{...card,diaFechamento:25,diaVencimento:5,version:2})
invoicePair('distanceTwoReverse',calendar('2026-10',30,31,2),{'2':stored(calendar('2026-12',25,5))},false,{...card,diaFechamento:30,diaVencimento:31,version:2})
invoicePair('februaryCoincidence',calendar('2027-02',30,31),{},true,{...card,diaFechamento:30,diaVencimento:31})
invoicePair('archivedCard',calendar('2026-10'),{},false,{...card,estado:'arquivado',archivedAt:old})
const before=stored(calendar('2026-10')),b={...calendar('2026-10'),vencimento:'2026-10-19'},after={...before,...b,version:2,ultimoEventoId:'ajustarVencimento__adjust',updatedAt:time},r=receipt('ajustarVencimento','adjust','card__2026-10',1,{vencimento:b.vencimento,motivo:'Fixture'},b,{vencimento:before.vencimento})
const mocks=[mock('getAfter',path('operacoesFaturas','ajustarVencimento__adjust'),{data:r}),mock('getAfter',path('faturas','card__2026-10'),{data:after})]
add('adjust','faturas','card__2026-10','update',after,before,mocks)
add('adjustReceipt','operacoesFaturas','ajustarVencimento__adjust','create',r,undefined,mocks)
add('adjustChangesBoundary','faturas','card__2026-10','update',{...after,inicio:'2026-09-11'},before,mocks,false)
const output = new URL('../specs/006-cartoes-ciclos-faturas/rules-evaluation-cases.json', import.meta.url)
const invoiceCases = cases.filter(item => !['criarCartao','editarCartao','arquivarCartao','cardForbiddenField'].some(prefix => item.name.startsWith(prefix)))
fs.writeFileSync(output, JSON.stringify({schemaVersion:1, purpose:'Official test-only invoice Rules fixtures. Fixed synthetic data; no credentials, deploy or writes.', cases:invoiceCases}, null, 2)+'\n')
console.log(JSON.stringify({generated:invoiceCases.length, network:false}))