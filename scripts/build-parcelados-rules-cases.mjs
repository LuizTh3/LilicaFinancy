import fs from 'node:fs'
const folder=new URL('../specs/009-compromissos-parcelados-emprestimos/',import.meta.url)
export const time='2026-10-20T01:00:00Z',old='2020-01-01T00:00:00Z'
const base='/databases/(default)/documents/users/fixture/'
const path=(c,id)=>base+c+(id?'/'+id:'')
const mock=(name,p,v)=>({function:name,args:[{exactValue:p.replace('(default)','%28default%29')}],result:{value:v}})
const profile={uid:'fixture',schemaVersion:1,primeiro_login:false,timezone:'America/Rio_Branco',passwordChangeCompletedAt:old}
const catalog=(natureza)=>({schemaVersion:2,version:1,nome:'Fixture',estado:'ativo',createdAt:old,updatedAt:old,...(natureza?{natureza}:{})})
const witness={eventoId:'criarDespesa__past',origemId:'past',papel:'classificacao',createdAt:old}
const mocksBase=[mock('get','/databases/(default)/documents/users/fixture',{data:profile}),mock('getAfter',path('categorias','cat'),{data:{...catalog('despesa'),usoFinanceiro:witness}}),mock('getAfter',path('titulares','holder'),{data:catalog()}),mock('getAfter',path('contas','account'),{data:{...catalog(),tipo:'dinheiro',usoFinanceiro:{...witness,papel:'movimentacao',eventoId:'pagar__past'}}})]
for(let i=0;i<5;i++)mocksBase.push(mock('getAfter',path('etiquetas','label'+i),{data:catalog()}))
const clone=v=>structuredClone(v)
const month=(start,offset)=>{let [y,m]=start.split('-').map(Number);m=y*12+m-1+offset;return `${Math.floor(m/12)}-${String(m%12+1).padStart(2,'0')}`}
const date=(m,day=31)=>{const [y,n]=m.split('-').map(Number);return m+'-'+String(Math.min(day,new Date(Date.UTC(y,n,0)).getUTCDate())).padStart(2,'0')}
function makeSeries({n=10,p=5,key='key',id='serie',optional=false,explicit=false}={}) {
 const event='criarSerie__'+key,refs={categoriaId:'cat',...(optional?{titularId:'holder',contaPrevistaId:'account',etiquetaIds:Array.from({length:5},(_,i)=>'label'+i)}:{})}
 const parcelas={};for(let i=p;i<=n;i++){const m=month('2026-12',i-p);parcelas['p'+String(i).padStart(2,'0')]={numero:i,quantidadeOriginal:n,descricao:'Parcela',...refs,valorCentavos:20000,competenciaPlanejamento:m,vencimento:date(m),estadoObrigacao:'ativa',liquidadoLiquidoCentavos:0,jaLiquidada:false,ultimoEventoParcelaId:event}}
 const dados={tipo:'emprestimo',origemDados:p==1?'nova':'migrada',quantidadeOriginal:n,numeroInicial:p,descricao:'Emprestimo manual',modo:explicit?'explicito':'mensal',...(!explicit?{diaAncora:31}:{}),parcelas,competencias:Object.values(parcelas).map(p=>p.competenciaPlanejamento)}
 const s={...dados,schemaVersion:1,version:1,ultimoEventoId:event,createdAt:time,updatedAt:time}
 const r={schemaVersion:1,contractVersion:1,tipo:'criarSerie',operationKey:key,seriesIds:[id],expectedVersions:{[id]:0},resultVersions:{[id]:1},comando:{serieId:id,criacao:{dados:clone(dados),referencias:refs,calculo:{tipo:'porParcela',totalCentavos:20000*(n-p+1),valorCentavos:20000}}},createdAt:time}
 return {s,r,id,event}
}
const cases=[]
function add(name,c,id,method,data,before,mocks=[],allow=true,auth={uid:'fixture',token:{auth_time:1792458000}}) {
 cases.push({name,test:{expectation:allow?'ALLOW':'DENY',request:{path:path(c,id),method,...(auth?{auth}:{}),time,...(data?{resource:{data}}:{})},...(before?{resource:{data:before}}:{}),functionMocks:[...new Map([...clone(mocksBase),...clone(mocks)].map(m=>[m.function+'|'+m.args[0].exactValue,m])).values()],expressionReportLevel:'FULL'}})
}
function pair(prefix,obj,allow=true) {
 const m=[mock('getAfter',path('seriesParceladas',obj.id),{data:obj.s}),mock('getAfter',path('operacoesParceladas',obj.event),{data:obj.r})]
 const witness={schemaVersion:1,serieId:obj.id,eventoId:obj.event,resultVersion:1,createdAt:time}
 if(!obj.before)m.push(mock('getAfter',path('validacoesParceladas',obj.event+'__'+obj.id),{data:witness}))
 add(prefix+'Series','seriesParceladas',obj.id,obj.before?'update':'create',obj.s,obj.before,m,allow)
 add(prefix+'Receipt','operacoesParceladas',obj.event,'create',obj.r,undefined,m,allow)
 if(!obj.before)add(prefix+'Witness','validacoesParceladas',obj.event+'__'+obj.id,'create',witness,undefined,m,allow)
 return m
}
const core=makeSeries();pair('create5of10',core)
pair('create12',makeSeries({n:12,p:1,key:'twelve'}))
pair('createMaxRefs',makeSeries({n:12,p:1,key:'refs',optional:true}))
pair('createOne',makeSeries({n:1,p:1,key:'one'}))
let explicit=makeSeries({n:7,p:5,key:'explicit',explicit:true});
for(const [i,val,due] of [[5,11000,'2026-12-15'],[6,9550,'2027-02-03'],[7,8000,'2027-02-20']]){Object.assign(explicit.s.parcelas['p0'+i],{valorCentavos:val,vencimento:due,competenciaPlanejamento:due.slice(0,7)})}
explicit.s.competencias=['2026-12','2027-02'];explicit.r.comando.criacao.dados=Object.fromEntries(Object.entries(explicit.s).filter(([k])=>!['schemaVersion','version','ultimoEventoId','createdAt','updatedAt'].includes(k)));explicit.r.comando.criacao.calculo={tipo:'explicito',totalCentavos:28550};pair('explicitUnequal',explicit)
let total=makeSeries({n:3,p:1,key:'division'});for(let i=1;i<=3;i++)total.s.parcelas['p0'+i].valorCentavos=i==1?3334:3333;total.r.comando.criacao.dados.parcelas=clone(total.s.parcelas);total.r.comando.criacao.calculo={tipo:'total',totalCentavos:10000,q:3333,resto:1};pair('division100by3',total)
function mutation(tipo,key='change') {
 const before=clone(core.s);before.createdAt=old;before.updatedAt=old
 const event=tipo+'__'+key,s={...clone(before),version:2,ultimoEventoId:event,updatedAt:time}
 const r={schemaVersion:1,contractVersion:1,tipo,operationKey:key,seriesIds:['serie'],expectedVersions:{serie:1},resultVersions:{serie:2},comando:{serieId:'serie'},createdAt:time}
 return {before,s,r,event,id:'serie'}
}
let edit=mutation('editarParcelas');edit.r.comando={serieId:'serie',selecionada:5,alcance:'esta',parcelas:{},referencias:{}};Object.assign(edit.s.parcelas.p05,{descricao:'Corrigida',valorCentavos:21000,ultimoEventoParcelaId:edit.event});edit.r.comando.parcelas.p05=clone(edit.s.parcelas.p05);pair('editOne',edit)
let editFuture=mutation('editarParcelas','future');editFuture.r.comando={serieId:'serie',selecionada:5,alcance:'estaEFuturasNaoPagas',parcelas:{},referencias:{},novoVencimento:'2027-01-31'}
for(let i=5;i<=10;i++){const k='p'+String(i).padStart(2,'0');Object.assign(editFuture.s.parcelas[k],{vencimento:date(month('2027-01',i-5)),ultimoEventoParcelaId:editFuture.event});editFuture.r.comando.parcelas[k]=clone(editFuture.s.parcelas[k])}pair('editFuture',editFuture)
let cancel=mutation('cancelarParcelas');cancel.r.comando={serieId:'serie',alvos:['p05'],motivo:'Cancelamento informado'};Object.assign(cancel.s.parcelas.p05,{estadoObrigacao:'cancelada',canceledAt:time,cancelamentoMotivo:cancel.r.comando.motivo,ultimoEventoParcelaId:cancel.event});pair('cancelOne',cancel)
let pay=mutation('pagarParcela');pay.r.comando.parcela='p05';pay.r.fato={tipo:'pagamento',valorCentavos:6000,contaId:'account',dataEfetiva:'2026-10-19'};pay.r.contextoParcela=clone(pay.before.parcelas.p05);Object.assign(pay.s.parcelas.p05,{liquidadoLiquidoCentavos:6000,jaLiquidada:true,ultimoEventoParcelaId:pay.event});pair('payPartial',pay)
let reverse=mutation('reverterPagamento');reverse.before=clone(pay.s);reverse.before.updatedAt=old;reverse.s={...clone(reverse.before),version:3,ultimoEventoId:reverse.event,updatedAt:time};reverse.r.expectedVersions.serie=2;reverse.r.resultVersions.serie=3;reverse.r.comando={serieId:'serie',parcela:'p05',originalEventoId:pay.event,motivo:'Erro de registro'};reverse.r.fato={...pay.r.fato,tipo:'reversaoPagamento',originalId:pay.event,motivo:reverse.r.comando.motivo};reverse.r.contextoParcela=clone(reverse.before.parcelas.p05);Object.assign(reverse.s.parcelas.p05,{liquidadoLiquidoCentavos:0,ultimoEventoParcelaId:reverse.event});
const marker={serieId:'serie',parcela:'p05',originalEventoId:pay.event,reversaoEventoId:reverse.event,createdAt:time};let rm=[mock('get',path('operacoesParceladas',pay.event),{data:pay.r}),mock('getAfter',path('reversoesParceladas',pay.event),{data:marker})];
for(const [name,c,id,data,before] of [['reverseSeries','seriesParceladas','serie',reverse.s,reverse.before],['reverseReceipt','operacoesParceladas',reverse.event,reverse.r],['reverseMarker','reversoesParceladas',pay.event,marker]])add(name,c,id,before?'update':'create',data,before,[...rm,mock('getAfter',path('seriesParceladas','serie'),{data:reverse.s}),mock('getAfter',path('operacoesParceladas',reverse.event),{data:reverse.r})])
let replacement=mutation('substituirSerie');replacement.r.comando={serieId:'serie',novaSerieId:'newserie',alvos:['p05'],motivo:'Renegociacao manual',nova:null};Object.assign(replacement.s.parcelas.p05,{estadoObrigacao:'cancelada',canceledAt:time,cancelamentoMotivo:replacement.r.comando.motivo,ultimoEventoParcelaId:replacement.event});const next=makeSeries({n:1,p:1,id:'newserie',key:'replacement'});next.s.ultimoEventoId=replacement.event;next.s.parcelas.p01.ultimoEventoParcelaId=replacement.event;next.s.substituiSerieId='serie';next.s.substituicaoEventoId=replacement.event;next.r.comando.criacao.dados.parcelas=clone(next.s.parcelas);replacement.r.comando.nova=next.r.comando.criacao;replacement.r.seriesIds=['serie','newserie'];replacement.r.expectedVersions.newserie=0;replacement.r.resultVersions.newserie=1;
const replaceWitness={schemaVersion:1,serieId:'newserie',eventoId:replacement.event,resultVersion:1,createdAt:time}
const replaceMocks=[mock('getAfter',path('seriesParceladas','serie'),{data:replacement.s}),mock('getAfter',path('seriesParceladas','newserie'),{data:next.s}),mock('getAfter',path('operacoesParceladas',replacement.event),{data:replacement.r}),mock('getAfter',path('validacoesParceladas',replacement.event+'__newserie'),{data:replaceWitness})]
add('replaceOld','seriesParceladas','serie','update',replacement.s,replacement.before,replaceMocks);add('replaceNew','seriesParceladas','newserie','create',next.s,undefined,replaceMocks);add('replaceReceipt','operacoesParceladas',replacement.event,'create',replacement.r,undefined,replaceMocks)
add('replaceWitness','validacoesParceladas',replacement.event+'__newserie','create',replaceWitness,undefined,replaceMocks)
let link=mutation('vincularReceita');link.r.comando.receitaId='income';link.s.receitaVinculadaId='income';const v={serieId:'serie',receitaId:'income',operacaoId:link.event,createdAt:time},income={natureza:'receita',schemaVersion:1};const lm=[mock('get',path('lancamentosExternos','income'),{data:income}),mock('getAfter',path('vinculosReceitasEmprestimos','income'),{data:v}),mock('getAfter',path('seriesParceladas','serie'),{data:link.s}),mock('getAfter',path('operacoesParceladas',link.event),{data:link.r})];
add('linkSeries','seriesParceladas','serie','update',link.s,link.before,lm);add('linkReceipt','operacoesParceladas',link.event,'create',link.r,undefined,lm);add('linkMarker','vinculosReceitasEmprestimos','income','create',v,undefined,lm)
// Adversarial cases retain all unrelated dependencies: a missing mock is never the denial oracle.
function negative(name,original,change){const t=clone(cases.find(c=>c.name===original).test);t.expectation='DENY';change(t);cases.push({name,test:t})}
for(const [name,change] of [
 ['missingSlot',t=>{delete t.request.resource.data.parcelas.p05}],
 ['extraPreviousSlot',t=>{t.request.resource.data.parcelas.p01={...t.request.resource.data.parcelas.p05,numero:1}}],
 ['ordinalMismatch',t=>{t.request.resource.data.parcelas.p05.numero=6}],
 ['inventedPaidHistory',t=>{t.request.resource.data.parcelas.p05.jaLiquidada=true}],
 ['unknownPrincipalZero',t=>{t.request.resource.data.valorOriginalCentavos=0}],
 ['principalFabricatedPayload',t=>{t.request.resource.data.valorOriginalCentavos=200000}],
 ['quantity13',t=>{t.request.resource.data.quantidadeOriginal=13}],
 ['moneyOverflow',t=>{t.request.resource.data.parcelas.p05.valorCentavos=9007199254740992}],
 ['fractionalCents',t=>{t.request.resource.data.parcelas.p05.valorCentavos=1.5}],
 ['invalidCalendar',t=>{t.request.resource.data.parcelas.p05.vencimento='2026-02-30'}],
 ['wrongCompetencias',t=>{t.request.resource.data.competencias=['2026-01']}],
 ['unknownField',t=>{t.request.resource.data.pago=true}],
 ['missingReceipt',t=>{t.functionMocks=t.functionMocks.map(m=>m.args[0].exactValue.includes('/operacoesParceladas/')?{...m,result:{value:null}}:m)}],
 ['foreignUser',t=>{t.request.auth.uid='other'}],
 ['visitor',t=>{delete t.request.auth}]
])negative(name,'create5of10Series',change)
negative('receiptNoSeries','create5of10Receipt',t=>{t.functionMocks=t.functionMocks.map(m=>m.args[0].exactValue.includes('/seriesParceladas/')?{...m,result:{value:null}}:m)})
negative('pendingFirstAccess','create5of10Receipt',t=>{t.functionMocks[0].result.value.data.primeiro_login=true})
negative('adminNoOwnership','create5of10Receipt',t=>{t.request.auth.uid='admin'})
negative('editPaidProtected','editOneSeries',t=>{t.resource.data.parcelas.p05.jaLiquidada=true})
negative('cancelPaidProtected','cancelOneSeries',t=>{t.resource.data.parcelas.p05.liquidadoLiquidoCentavos=100})
negative('payOverPending','payPartialSeries',t=>{t.request.resource.data.parcelas.p05.liquidadoLiquidoCentavos=25000})
negative('payFakeControl','payPartialSeries',t=>{t.request.resource.data.parcelas.p05.liquidadoLiquidoCentavos=5000})
negative('payFutureDate','payPartialSeries',t=>{for(const m of t.functionMocks)if(m.args[0].exactValue.includes('/operacoesParceladas/'))m.result.value.data.fato.dataEfetiva='2027-01-01'})
negative('payChangeOtherSlot','payPartialSeries',t=>{t.request.resource.data.parcelas.p06.valorCentavos=1})
negative('reverseAlterAccount','reverseSeries',t=>{for(const m of t.functionMocks)if(m.args[0].exactValue.endsWith('/'+reverse.event))m.result.value.data.fato.contaId='other'})
negative('linkAlreadyLinked','linkSeries',t=>{t.resource.data.receitaVinculadaId='oldincome'})
negative('receiptUnknownCommand','create5of10Receipt',t=>{t.request.resource.data.comando.saldoLivre=12})
negative('replaceIncomplete','replaceReceipt',t=>{t.functionMocks=t.functionMocks.map(m=>m.args[0].exactValue.endsWith('/newserie')?{...m,result:{value:null}}:m)})
for(const c of ['seriesParceladas','operacoesParceladas','reversoesParceladas','vinculosReceitasEmprestimos']){
 const id=c==='seriesParceladas'?'serie':c==='vinculosReceitasEmprestimos'?'income':core.event;
 add('readOwn-'+c,c,id,'get',undefined,c==='seriesParceladas'?core.s:core.r)
 add('readOther-'+c,c,id,'get',undefined,core.s,[],false,{uid:'other',token:{auth_time:1792458000}})
 add('readVisitor-'+c,c,id,'get',undefined,core.s,[],false,null)
 add('deleteDenied-'+c,c,id,'delete',undefined,core.s,[],false)
}
// Additional boundary and witness scenarios. Each positive is checked on every written path.
const getAfter=(c,id,data)=>mock('getAfter',path(c,id),{data})
const get=(c,id,data)=>mock('get',path(c,id),data===null?null:{data})
const business=s=>Object.fromEntries(Object.entries(s).filter(([k])=>!['schemaVersion','version','ultimoEventoId','createdAt','updatedAt','substituiSerieId','substituicaoEventoId'].includes(k)))
let maxMoney=makeSeries({n:1,p:1,key:'maxmoney'});maxMoney.s.parcelas.p01.valorCentavos=9007199254740991;maxMoney.r.comando.criacao.dados=business(maxMoney.s);maxMoney.r.comando.criacao.calculo={tipo:'total',totalCentavos:9007199254740991,q:9007199254740991,resto:0};pair('maximumMoney',maxMoney)
let known=makeSeries({n:1,p:1,key:'known'});known.s.valorOriginalCentavos=15000;known.r.comando.criacao.dados=business(known.s);pair('knownPrincipalDifferent',known)
let first=makeSeries({n:12,p:1,key:'firstcat',optional:true});const catBefore={...catalog('despesa'),schemaVersion:1},catAfter={...catBefore,schemaVersion:2,usoFinanceiro:{eventoId:first.event,origemId:'serie',papel:'classificacao',createdAt:time}};
const firstMocks=[getAfter('categorias','cat',catAfter),get('operacoesParceladas',first.event,null),getAfter('operacoesParceladas',first.event,first.r),getAfter('seriesParceladas','serie',first.s)]
add('firstUseSeries','seriesParceladas','serie','create',first.s,undefined,firstMocks);add('firstUseReceipt','operacoesParceladas',first.event,'create',first.r,undefined,firstMocks);add('firstUseCategory','categorias','cat','update',catAfter,catBefore,firstMocks)
let repMax=mutation('substituirSerie','maximum');const oldMax=makeSeries({n:12,p:1,key:'oldmaximum'});repMax.before={...oldMax.s,createdAt:old,updatedAt:old};repMax.s={...clone(repMax.before),version:2,updatedAt:time,ultimoEventoId:repMax.event};const newMax=makeSeries({n:12,p:1,key:'newmaximum',id:'newserie',optional:true});newMax.s.ultimoEventoId=repMax.event;newMax.s.substituiSerieId='serie';newMax.s.substituicaoEventoId=repMax.event;for(const slot of Object.values(newMax.s.parcelas))slot.ultimoEventoParcelaId=repMax.event;
repMax.r.seriesIds=['serie','newserie'];repMax.r.expectedVersions.newserie=0;repMax.r.resultVersions.newserie=1;repMax.r.comando={serieId:'serie',novaSerieId:'newserie',alvos:Object.keys(repMax.s.parcelas),motivo:'Novo cronograma manual',nova:{...clone(newMax.r.comando.criacao),dados:business(newMax.s)}};
for(const slot of Object.values(repMax.s.parcelas))Object.assign(slot,{estadoObrigacao:'cancelada',canceledAt:time,cancelamentoMotivo:repMax.r.comando.motivo,ultimoEventoParcelaId:repMax.event});
const newCat={...catBefore,schemaVersion:2,usoFinanceiro:{eventoId:repMax.event,origemId:'newserie',papel:'classificacao',createdAt:time}},mm=[getAfter('seriesParceladas','serie',repMax.s),getAfter('seriesParceladas','newserie',newMax.s),getAfter('operacoesParceladas',repMax.event,repMax.r),get('operacoesParceladas',repMax.event,null),getAfter('categorias','cat',newCat)];
add('replaceMaximumOld','seriesParceladas','serie','update',repMax.s,repMax.before,mm);add('replaceMaximumNew','seriesParceladas','newserie','create',newMax.s,undefined,mm);add('replaceMaximumReceipt','operacoesParceladas',repMax.event,'create',repMax.r,undefined,mm);add('replaceMaximumFirstUse','categorias','cat','update',newCat,catBefore,mm)
const accountBefore={...catalog(),schemaVersion:1,tipo:'dinheiro'},accountAfter={...accountBefore,schemaVersion:2,usoFinanceiro:{eventoId:pay.event,origemId:'serie',papel:'movimentacao',createdAt:time}},pm=[getAfter('seriesParceladas','serie',pay.s),getAfter('operacoesParceladas',pay.event,pay.r),get('operacoesParceladas',pay.event,null),getAfter('contas','account',accountAfter)];
add('payFirstAccount','contas','account','update',accountAfter,accountBefore,pm)
let integral=clone(pay);integral.r.operationKey='integral';integral.event='pagarParcela__integral';integral.s.ultimoEventoId=integral.event;integral.s.parcelas.p05.ultimoEventoParcelaId=integral.event;integral.s.parcelas.p05.liquidadoLiquidoCentavos=20000;integral.r.fato.valorCentavos=20000;pair('payIntegral',integral)
let afterReverse=clone(cancel);afterReverse.before.parcelas.p05.jaLiquidada=true;afterReverse.s.parcelas.p05.jaLiquidada=true;pair('cancelReversedHistory',afterReverse)
negative('resetJaLiquidada','reverseSeries',t=>{t.request.resource.data.parcelas.p05.jaLiquidada=false})
negative('reverseOverOriginal','reverseSeries',t=>{for(const m of t.functionMocks)if(m.args[0].exactValue.endsWith('/'+reverse.event))m.result.value.data.fato.valorCentavos=7000})
negative('reverseMarkerWrongTarget','reverseMarker',t=>{t.request.resource.data.parcela='p06'})
negative('reverseSecondMarkerWrite','reverseMarker',t=>{t.request.method='update';t.resource={data:clone(t.request.resource.data)}})
negative('linkSecondReceipt','linkMarker',t=>{t.request.method='update';t.resource={data:clone(t.request.resource.data)}})
negative('linkWrongIncomeNature','linkReceipt',t=>{for(const m of t.functionMocks)if(m.args[0].exactValue.endsWith('/income')&&m.function==='get')m.result.value.data.natureza='despesa'})
negative('linkWrongIncomeOwner','linkReceipt',t=>{for(const m of t.functionMocks)if(m.args[0].exactValue.includes('/lancamentosExternos/'))m.result={value:null}})
negative('categoryWitnessWrongEvent','firstUseCategory',t=>{t.request.resource.data.usoFinanceiro.eventoId='pagarParcela__absent'})
negative('categoryNatureChangedWithFirstUse','firstUseCategory',t=>{t.request.resource.data.natureza='receita'})
negative('accountInitialBalanceChanged','payFirstAccount',t=>{t.request.resource.data.saldoInicialCentavos=123})
negative('createCategoryArchived','create5of10Series',t=>{for(const m of t.functionMocks)if(m.args[0].exactValue.endsWith('/cat'))m.result.value.data.estado='arquivado'})
negative('createHolderArchived','createMaxRefsSeries',t=>{for(const m of t.functionMocks)if(m.args[0].exactValue.endsWith('/holder'))m.result.value.data.estado='arquivado'})
negative('createLabelArchived','createMaxRefsReceipt',t=>{for(const m of t.functionMocks)if(m.args[0].exactValue.endsWith('/label4'))m.result.value.data.estado='arquivado'})
negative('payAccountArchived','payPartialSeries',t=>{for(const m of t.functionMocks)if(m.args[0].exactValue.endsWith('/account'))m.result.value.data.estado='arquivado'})
negative('replacePaidPosition','replaceOld',t=>{t.resource.data.parcelas.p05.liquidadoLiquidoCentavos=1})
negative('replayReceiptAgainstNewVersion','editOneSeries',t=>{t.request.resource.data.version=3})
negative('editProtectedFutureHidden','editFutureSeries',t=>{t.resource.data.parcelas.p06.jaLiquidada=true})
negative('editOtherSlotOutsideScope','editOneSeries',t=>{t.request.resource.data.parcelas.p06.descricao='changed'})
negative('cancelUnknownOrdinal','cancelOneSeries',t=>{for(const m of t.functionMocks)if(m.args[0].exactValue.endsWith('/'+cancel.event))m.result.value.data.comando.alvos=['p01']})
// Coupled create mutations eliminate payload mismatch as an accidental denial oracle.
for(const name of ['missingSlot','extraPreviousSlot','ordinalMismatch','inventedPaidHistory','unknownPrincipalZero','quantity13','moneyOverflow','fractionalCents','invalidCalendar','wrongCompetencias','unknownField']) {
 const test=cases.find(c=>c.name===name).test
 for(const m of test.functionMocks)if(m.function==='getAfter'&&m.args[0].exactValue.endsWith('/'+core.event)&&m.result.value)m.result.value.data.comando.criacao.dados=business(test.request.resource.data)
}
for(const [uid,auth,pending] of [['fixture',{uid:'fixture',token:{auth_time:1792458000}},false],['visitor',null,false],['admin',{uid:'admin',token:{auth_time:1792458000}},false],['fixture',{uid:'fixture',token:{auth_time:1792458000}},true]]) {
 const extra=pending?[mock('get','/databases/(default)/documents/users/fixture',{data:{...profile,primeiro_login:true}})]:[]
 for(const c of ['seriesParceladas','operacoesParceladas'])for(const limit of [1,50,51]) {
  add(`list-${c}-${uid}-${pending}-${limit}`,c,'','list',undefined,core.s,extra,uid==='fixture'&&!pending&&limit<=50,auth)
  cases.at(-1).test.request.query={limit}
 }
}
negative('readOwnPending','readOwn-seriesParceladas',t=>{t.functionMocks[0].result.value.data.primeiro_login=true})
negative('readOwnCutoffExpired','readOwn-seriesParceladas',t=>{t.request.auth.token.auth_time=1})
// Checks delegated by the atomic S/R/V protocol are exercised at their enforcing write.
for(const [name,target] of [['extraPreviousSlot','Receipt'],['unknownPrincipalZero','Receipt'],['unknownField','Receipt'],['wrongCompetencias','Witness'],['invalidCalendar','Witness'],['ordinalMismatch','Series']]) {
 const item=cases.find(c=>c.name===name), mutated=clone(item.test.request.resource.data)
 const receipt=clone(core.r);receipt.comando.criacao.dados=business(mutated)
 const witness={schemaVersion:1,serieId:core.id,eventoId:core.event,resultVersion:1,createdAt:time}
 const t=clone(cases.find(c=>c.name==='create5of10'+target).test)
 t.expectation='DENY';t.request.resource.data=target==='Receipt'?receipt:target==='Series'?mutated:witness
 for(const m of t.functionMocks)if(m.function==='getAfter') {
  if(m.args[0].exactValue.endsWith('/seriesParceladas/'+core.id))m.result.value={data:mutated}
  if(m.args[0].exactValue.endsWith('/operacoesParceladas/'+core.event))m.result.value={data:receipt}
 }
 item.test=t
}
negative('missingCreationWitness','create5of10Series',t=>{for(const m of t.functionMocks)if(m.args[0].exactValue.includes('/validacoesParceladas/'))m.result={value:null}})
negative('createCannotOverwriteExisting','createOneSeries',t=>{t.request.method='update';t.resource={data:clone(t.request.resource.data)};t.resource.data.createdAt=old;t.resource.data.updatedAt=old})
negative('witnessWrongLink','createOneSeries',t=>{for(const m of t.functionMocks)if(m.args[0].exactValue.includes('/validacoesParceladas/'))m.result.value.data.serieId='other'})
negative('witnessNoSeries','createOneWitness',t=>{for(const m of t.functionMocks)if(m.args[0].exactValue.includes('/seriesParceladas/'))m.result={value:null}})
negative('witnessNoReceipt','createOneWitness',t=>{for(const m of t.functionMocks)if(m.args[0].exactValue.includes('/operacoesParceladas/'))m.result={value:null}})
negative('witnessWrongVersion','createOneWitness',t=>{t.request.resource.data.resultVersion=2})
negative('witnessUnknownField','createOneWitness',t=>{t.request.resource.data.pago=true})
negative('witnessStale','createOneWitness',t=>{t.request.resource.data.createdAt=old})
negative('witnessForeignUser','createOneWitness',t=>{t.request.auth.uid='admin'})
negative('witnessImmutableUpdate','createOneWitness',t=>{t.request.method='update';t.resource={data:clone(t.request.resource.data)}})
negative('witnessImmutableDelete','createOneWitness',t=>{t.request.method='delete';t.resource={data:clone(t.request.resource.data)};delete t.request.resource})
for(let n=5;n<=10;n++)for(const field of ['numero','valorCentavos','vencimento']) {
 const mutated=clone(core.s), k='p'+String(n).padStart(2,'0')
 mutated.parcelas[k][field]=field==='vencimento'?'2026-02-30':mutated.parcelas[k][field]+1
 const receipt=clone(core.r);receipt.comando.criacao.dados=business(mutated)
 const target=n===5?(field==='vencimento'?'Witness':'Series'):['Series','Receipt','Witness'][(n-1)%3], t=clone(cases.find(c=>c.name==='create5of10'+target).test)
 t.expectation='DENY';t.request.resource.data=target==='Series'?mutated:target==='Receipt'?receipt:t.request.resource.data
 for(const m of t.functionMocks)if(m.function==='getAfter') {
  if(m.args[0].exactValue.endsWith('/seriesParceladas/'+core.id))m.result.value={data:mutated}
  if(m.args[0].exactValue.endsWith('/operacoesParceladas/'+core.event))m.result.value={data:receipt}
 }
 cases.push({name:`creationPart-${n}-${field}`,test:t})
}
const output={schemaVersion:1,purpose:'Official test-only synthetic evaluation; no release or real fixtures.',cases}
fs.writeFileSync(new URL('rules-evaluation-cases.json',folder),JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({cases:cases.length,allow:cases.filter(c=>c.test.expectation==='ALLOW').length,deny:cases.filter(c=>c.test.expectation==='DENY').length,network:false}))


