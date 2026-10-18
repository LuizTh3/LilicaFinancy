import { Timestamp } from 'firebase/firestore'
import { competencia, dataCalendario } from '../../domain/finance/calendar'
import { idCadastroValido } from '../../domain/finance/cadastros'
import { registro } from '../../domain/finance/errors'
import { tipoEventoExterno } from '../../domain/finance/externosValidation'
import type { SnapshotExterno } from '../../domain/finance/contracts/externos'

type ColecaoLeitura = 'lancamentosExternos'|'operacoesExternas'|'reversoesExternas'|'titulares'|'categorias'|'contas'|'etiquetas'
export type ReferenciaLeituraExterna = Readonly<{colecao:ColecaoLeitura;id:string}>
type PosicaoData = Readonly<{data:string;id:string}>
export type QueryExterna =
 | Readonly<{colecao:'lancamentosExternos';natureza:'receita'|'despesa';competencia:string;pageSize:number;apos?:PosicaoData}>
 | Readonly<{colecao:'operacoesExternas';origemId:string;pageSize:number;aposVersao?:number}>
 | Readonly<{colecao:'operacoesExternas';inicio:string;fim:string;fimInclusivo?:boolean;pageSize:number;apos?:PosicaoData}>
export type DocumentoLeituraExterna = Readonly<{colecao:ColecaoLeitura;id:string;dados:Record<string,unknown>|undefined}>
type ContextoLeitura = Readonly<{projectId:string;uid:string;generation:number;atual:()=>boolean;token:()=>Promise<string>;agora?:()=>number;fetcher?:typeof fetch}>
function fail(code:string):never {throw Object.assign(new Error(code==='semPermissao'?'A sessão não autoriza a leitura.':'Não foi possível confirmar um snapshot financeiro completo.'),{code})}
function instant(value:unknown):value is string {return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/.test(value)&&Number.isFinite(Date.parse(value))}
function canonicalInstant(value:string) {const [base,fraction='']=value.slice(0,-1).split('.');return base+'.'+fraction.padEnd(9,'0')+'Z'}
function decodeValue(value:unknown,depth=0):unknown {
 if(!registro(value)||depth>12||Object.keys(value).length!==1)fail('esquemaIncompativel')
 if(typeof value.stringValue==='string')return value.stringValue
 if(typeof value.booleanValue==='boolean')return value.booleanValue
 if(typeof value.integerValue==='string'&&/^-?(0|[1-9][0-9]*)$/.test(value.integerValue)&&Number.isSafeInteger(Number(value.integerValue)))return Number(value.integerValue)
 if('nullValue'in value&&value.nullValue===null)return null
 if(instant(value.timestampValue)) {
  const nanos=Number((value.timestampValue.match(/\.(\d+)Z$/)?.[1]??'').padEnd(9,'0'))
  return new Timestamp(Math.floor(Date.parse(value.timestampValue)/1000),nanos)
 }
 if(registro(value.mapValue)&&Object.keys(value.mapValue).every(k=>k==='fields'))return decodeFields(value.mapValue.fields??{},depth+1)
 if(registro(value.arrayValue)&&Object.keys(value.arrayValue).every(k=>k==='values')&&(!('values'in value.arrayValue)||Array.isArray(value.arrayValue.values)))return ((value.arrayValue.values??[]) as unknown[]).map(v=>decodeValue(v,depth+1))
 fail('esquemaIncompativel')
}
function decodeFields(value:unknown,depth=0):Record<string,unknown> {
 if(!registro(value)||depth>12||Object.keys(value).length>50)fail('esquemaIncompativel')
 const pairs=Object.entries(value).map(([k,v])=>{if(['__proto__','prototype','constructor'].includes(k))fail('esquemaIncompativel');return [k,decodeValue(v,depth)] as const})
 return Object.fromEntries(pairs)
}
export function createExternosSnapshotReader(ctx:ContextoLeitura) {
 if(!/^[a-z0-9][a-z0-9-]{3,62}$/.test(ctx.projectId)||!ctx.uid||ctx.uid.includes('/')||!Number.isSafeInteger(ctx.generation)||ctx.generation<1)fail('valorInvalido')
 const now=ctx.agora??Date.now,fetcher=ctx.fetcher??fetch
 const prefix=`projects/${ctx.projectId}/databases/(default)/documents/users/${ctx.uid}`
 const endpoint='https://firestore.googleapis.com/v1/'+prefix
 const check=()=>{if(!ctx.atual())fail('semPermissao')}
 function checkSnapshot(snapshot:SnapshotExterno) {
  check()
  if(snapshot.uid!==ctx.uid||snapshot.generation!==ctx.generation||!instant(snapshot.readTime)||snapshot.expiresAt!==Date.parse(snapshot.readTime)+50*60000||now()>=snapshot.expiresAt||Date.parse(snapshot.readTime)>now()+60000)fail('snapshotExpirado')
 }
 function reference(ref:ReferenciaLeituraExterna) {
  if(!ref||!['lancamentosExternos','operacoesExternas','reversoesExternas','titulares','categorias','contas','etiquetas'].includes(ref.colecao))fail('referenciaInvalida')
  const type=tipoEventoExterno(ref.id)
  if(ref.colecao==='operacoesExternas'?!type:ref.colecao==='reversoesExternas'?!['pagar','receber','gastoImediato'].includes(String(type)):!idCadastroValido(ref.id))fail('referenciaInvalida')
  return prefix+'/'+ref.colecao+'/'+ref.id
 }
 function document(value:unknown):DocumentoLeituraExterna {
  if(!registro(value))fail('esquemaIncompativel')
  const raw='found'in value?value.found:'document'in value?value.document:undefined
  const name=registro(raw)?raw.name:value.missing
  if(typeof name!=='string'||!name.startsWith(prefix+'/'))fail('referenciaInvalida')
  const parts=name.slice(prefix.length+1).split('/')
  if(parts.length!==2)fail('referenciaInvalida')
  const ref={colecao:parts[0] as ColecaoLeitura,id:parts[1]}
  if(reference(ref)!==name)fail('referenciaInvalida')
  return {...ref,dados:raw===undefined?undefined:decodeFields((raw as Record<string,unknown>).fields??{})}
 }
 async function post(method:'runQuery'|'batchGet',body:Record<string,unknown>,snapshot?:SnapshotExterno) {
  check();if(snapshot)checkSnapshot(snapshot)
  const token=await ctx.token();check()
  if(!token)fail('semPermissao')
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),20000)
  try {
   const url=method==='batchGet'?endpoint.slice(0,endpoint.lastIndexOf('/users/'))+':batchGet':endpoint+':runQuery'
   const response=await fetcher(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal,redirect:'error',cache:'no-store'})
   check();if(snapshot)checkSnapshot(snapshot)
   if(!response.ok)fail(response.status===401||response.status===403?'semPermissao':response.status===429?'cotaExcedida':response.status===400?'configuracaoPendente':'indisponivel')
   const data:unknown=await response.json();check();if(snapshot)checkSnapshot(snapshot)
   if(!Array.isArray(data)||data.some(row=>!registro(row)))fail('esquemaIncompativel')
   if(snapshot)for(const row of data)if(row.readTime!==undefined&&(!instant(row.readTime)||canonicalInstant(row.readTime)!==canonicalInstant(snapshot.readTime)))fail('integridadeIndeterminada')
   return data as Record<string,unknown>[]
  } finally {clearTimeout(timer)}
 }
 function queryBody(q:QueryExterna) {
  if(!Number.isInteger(q.pageSize)||q.pageSize<1||q.pageSize>50)fail('limiteOperacional')
  const filter=(fieldPath:string,op:string,value:Record<string,unknown>)=>({fieldFilter:{field:{fieldPath},op,value}})
  let filters:unknown[],orderBy:unknown[],startAt:unknown
  if(q.colecao==='lancamentosExternos') {
   if(!['receita','despesa'].includes(q.natureza)||!competencia(q.competencia).ok)fail('valorInvalido')
   const date=q.natureza==='receita'?'dataPrevista':'vencimento'
   filters=[filter('natureza','EQUAL',{stringValue:q.natureza}),filter('competenciaPlanejamento','EQUAL',{stringValue:q.competencia})]
   orderBy=[{field:{fieldPath:date},direction:'ASCENDING'},{field:{fieldPath:'__name__'},direction:'ASCENDING'}]
   if(q.apos){if(!dataCalendario(q.apos.data).ok)fail('dataInvalida');startAt={before:false,values:[{stringValue:q.apos.data},{referenceValue:reference({colecao:q.colecao,id:q.apos.id})}]}}
  } else if(q.colecao==='operacoesExternas'&&'origemId'in q) {
   if(!idCadastroValido(q.origemId)||(q.aposVersao!==undefined&&(!Number.isSafeInteger(q.aposVersao)||q.aposVersao<1)))fail('valorInvalido')
   filters=[filter('origemId','EQUAL',{stringValue:q.origemId})]
   if(q.aposVersao!==undefined)filters.push(filter('resultVersion','GREATER_THAN',{integerValue:String(q.aposVersao)}))
   orderBy=[{field:{fieldPath:'resultVersion'},direction:'ASCENDING'},{field:{fieldPath:'__name__'},direction:'ASCENDING'}]
  } else if(q.colecao==='operacoesExternas'&&'inicio'in q) {
   if(!dataCalendario(q.inicio).ok||!dataCalendario(q.fim).ok||q.inicio>q.fim)fail('dataInvalida')
   filters=[filter('fato.dataEfetiva','GREATER_THAN_OR_EQUAL',{stringValue:q.inicio}),filter('fato.dataEfetiva',q.fimInclusivo?'LESS_THAN_OR_EQUAL':'LESS_THAN',{stringValue:q.fim})]
   orderBy=[{field:{fieldPath:'fato.dataEfetiva'},direction:'ASCENDING'},{field:{fieldPath:'__name__'},direction:'ASCENDING'}]
   if(q.apos){if(!dataCalendario(q.apos.data).ok)fail('dataInvalida');startAt={before:false,values:[{stringValue:q.apos.data},{referenceValue:reference({colecao:q.colecao,id:q.apos.id})}]}}
  } else fail('valorInvalido')
  return {from:[{collectionId:q.colecao}],where:{compositeFilter:{op:'AND',filters}},orderBy,limit:q.pageSize,...(startAt?{startAt}:{})}
 }
 return {
  async iniciar():Promise<SnapshotExterno> {
   const rows=await post('runQuery',{structuredQuery:{from:[{collectionId:'lancamentosExternos'}],limit:1}})
   const readTime=rows.at(-1)?.readTime
   if(!instant(readTime))fail('integridadeIndeterminada')
   const snapshot={uid:ctx.uid,generation:ctx.generation,readTime,expiresAt:Date.parse(readTime)+50*60000}
   checkSnapshot(snapshot);return snapshot
  },
  async consultar(snapshot:SnapshotExterno,q:QueryExterna):Promise<DocumentoLeituraExterna[]> {
   checkSnapshot(snapshot)
   const rows=await post('runQuery',{structuredQuery:queryBody(q),readTime:snapshot.readTime},snapshot)
   const docs=rows.filter(row=>'document'in row).map(document)
   if(docs.length>q.pageSize||new Set(docs.map(d=>d.colecao+'/'+d.id)).size!==docs.length||docs.some(d=>d.colecao!==q.colecao))fail('integridadeIndeterminada')
   return docs
  },
  async obter(snapshot:SnapshotExterno,refs:readonly ReferenciaLeituraExterna[]):Promise<DocumentoLeituraExterna[]> {
   checkSnapshot(snapshot)
   if(refs.length<1||refs.length>8)fail('limiteOperacional')
   const documents=refs.map(reference)
   if(new Set(documents).size!==documents.length)fail('referenciaInvalida')
   const rows=await post('batchGet',{documents,readTime:snapshot.readTime},snapshot)
   const docs=rows.filter(row=>'found'in row||'missing'in row).map(document)
   const keys=docs.map(d=>reference(d))
   if(keys.length!==documents.length||new Set(keys).size!==keys.length||keys.some(k=>!documents.includes(k)))fail('integridadeIndeterminada')
   return refs.map(ref=>docs.find(d=>d.id===ref.id&&d.colecao===ref.colecao)!)
  }
 }
}
