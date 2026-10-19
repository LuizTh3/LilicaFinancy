import { collection, doc, documentId, getDocFromServer, getDocsFromServer, limit, orderBy, query, startAfter, where } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { avancarCompetencia, competencia, dataCalendario } from '../../domain/finance/calendar'
import { idCartaoValido } from '../../domain/finance/cartoes'
import { competenciasVizinhas, construirFatura, faturaId, identidadeFaturaValida, resolverPrimeiraFatura } from '../../domain/finance/faturas'
import type { ConsultaFaturas, Fatura, PaginaFaturas, PortaPreviaFatura, PreviaFatura } from '../../domain/finance/contracts/faturas'
import { sucesso } from '../../domain/finance/errors'
import type { Resultado } from '../../domain/finance/errors'
import type { Cartao } from '../../domain/finance/contracts/cartoes'
import type { CalendarioFaturaV2 } from '../../domain/finance/invoiceCalendar'
import type { ContextoCartoes } from './cartoesRepository'
import { decodeCartao } from './cartoesMapper'
import { decodeCadastro } from './cadastrosMapper'
import { decodeFatura, decodeReciboFatura } from './faturasMapper'
import { abortFatura as abort, erroFatura } from './faturasErrors'
export function createFaturasQueries(db:Firestore,ctx:ContextoCartoes) {
 const check=()=>{if(!ctx.uid||!ctx.atual())abort('semPermissao','A sessão mudou. Entre novamente.')}
 const ref=(card:string,month:string)=>{if(!idCartaoValido(card)||!competencia(month).ok)abort('valorInvalido','Cartão ou período inválido.');return doc(db,'users',ctx.uid,'faturas',faturaId(card,month))}
 async function card(id:string){check();if(!idCartaoValido(id))abort('valorInvalido','Cartão inválido.');const s=await getDocFromServer(doc(db,'users',ctx.uid,'cartoes',id));check();if(!s.exists())abort('naoEncontrado','Cartão não encontrado.');return decodeCartao(ctx.uid,id,s.data())}
 async function snapshots(id:string,months:readonly string[]){return Promise.all([...new Set(months)].map(async m=>{const s=await getDocFromServer(ref(id,m));check();return s.exists()?decodeFatura(ctx.uid,faturaId(id,m),s.data()):undefined})).then(all=>all.filter((f):f is Fatura=>!!f))}
 async function obter(id:string,month:string){try{check();const s=await getDocFromServer(ref(id,month));check();if(!s.exists())return {ok:false as const,erro:{codigo:'naoEncontrado' as const,mensagem:'Fatura não encontrada.'}};return sucesso(decodeFatura(ctx.uid,faturaId(id,month),s.data()))}catch(e){return erroFatura(e)}}
 async function periodo(id:string,month:string):Promise<Resultado<{cartao:Cartao;existente?:Fatura;calendario?:CalendarioFaturaV2}>>{try{const c=await card(id),current=await snapshots(id,[month]),found=current[0];if(found)return sucesso({cartao:c,existente:found,calendario:dadosCalendario(found)});if(c.estado==='arquivado')return sucesso({cartao:c});const all=await snapshots(id,competenciasVizinhas(month)),proposed=construirFatura(c,month,all);return proposed.ok?sucesso({cartao:c,calendario:proposed.valor}):proposed}catch(e){return erroFatura(e)}}
 const prever:PortaPreviaFatura['prever']=async(id,data,escolha)=>{
  try{
   if(!dataCalendario(data).ok||escolha!==undefined&&!competencia(escolha).ok)abort('dataInvalida','Data ou período inválido.')
   const c=await card(id)
   if(c.estado!=='ativo')abort('referenciaInvalida','Cartão arquivado não permite prévia de nova compra.')
   const q=query(collection(db,'users',ctx.uid,'faturas'),where('cartaoId','==',id),where('inicio','<=',data),where('fechamento','>',data),orderBy('inicio','asc'),orderBy('fechamento','asc'),orderBy(documentId(),'asc'),limit(2))
   const result=await getDocsFromServer(q);check()
   const containing=result.docs.map(s=>decodeFatura(ctx.uid,s.id,s.data()))
   const months=escolha?[escolha,...competenciasVizinhas(escolha)]:[-2,-1,0,1,2,3,4].flatMap(n=>{const m=avancarCompetencia(data.slice(0,7),n);return m.ok?[m.valor]:[]})
   const all=await snapshots(id,months)
   const resolved=resolverPrimeiraFatura(c,data,[...containing,...all],escolha);check()
   return resolved.ok?sucesso<PreviaFatura>({...resolved.valor,uid:ctx.uid,generation:ctx.generation,cartaoId:id,cartaoVersion:c.version,dataCompra:data}):resolved
  }catch(e){return erroFatura(e)}
 }
 async function listar(input:ConsultaFaturas):Promise<Resultado<PaginaFaturas>>{
  try{check();const {cartaoId,inicio,fim,cursor}=input,pagina=input.pagina??50
   if(!idCartaoValido(cartaoId)||!competencia(inicio).ok||!competencia(fim).ok||inicio>fim||!Number.isInteger(pagina)||pagina<1||pagina>50)abort('valorInvalido','Intervalo ou limite inválido.')
   if(cursor&&(cursor.uid!==ctx.uid||cursor.generation!==ctx.generation||cursor.cartaoId!==cartaoId||cursor.inicio!==inicio||cursor.fim!==fim||!competencia(cursor.competencia).ok||cursor.competencia<inicio||cursor.competencia>fim||cursor.id!==faturaId(cartaoId,cursor.competencia)))abort('valorInvalido','Cursor de outra consulta ou sessão.')
   const q=query(collection(db,'users',ctx.uid,'faturas'),where('cartaoId','==',cartaoId),where('competencia','>=',inicio),where('competencia','<=',fim),orderBy('competencia','asc'),orderBy(documentId(),'asc'),...(cursor?[startAfter(cursor.competencia,cursor.id)]:[]),limit(pagina))
   const s=await getDocsFromServer(q);check();const itens=s.docs.map(v=>decodeFatura(ctx.uid,v.id,v.data()))
   if(itens.some(f=>f.cartaoId!==cartaoId||f.competencia<inicio||f.competencia>fim))abort('integridadeIndeterminada','Consulta retornou referências incompatíveis.')
   const last=itens.at(-1),end=itens.length<pagina
   return sucesso({itens,fim:end,...(!end&&last?{cursor:{uid:ctx.uid,generation:ctx.generation,cartaoId,inicio,fim,competencia:last.competencia,id:last.id}}:{})})
  }catch(e){return erroFatura(e)}
 }
 async function historico(alvoId:string,apos=0,versaoEsperada?:number){try{check();if(!identidadeFaturaValida(alvoId)||!Number.isSafeInteger(apos)||apos<0)abort('valorInvalido','Consulta de histórico inválida.');let version=versaoEsperada;if(version===undefined){const target=await getDocFromServer(doc(db,'users',ctx.uid,'faturas',alvoId));check();if(!target.exists())abort('naoEncontrado','Fatura não encontrada.');version=decodeFatura(ctx.uid,alvoId,target.data()).version}if(!Number.isSafeInteger(version)||version<1||apos>version)abort('valorInvalido','Revisão de histórico inválida.');const s=await getDocsFromServer(query(collection(db,'users',ctx.uid,'operacoesFaturas'),where('alvoId','==',alvoId),orderBy('resultVersion','asc'),...(apos?[startAfter(apos)]:[]),limit(50)));check();const itens=s.docs.map(d=>decodeReciboFatura(d.id,d.data()));if(itens.some((r,i)=>r.alvoId!==alvoId||r.resultVersion!==apos+i+1||r.resultVersion>version!)||itens.length<50&&(itens.at(-1)?.resultVersion??apos)!==version)abort('integridadeIndeterminada','Histórico com lacuna ou revisão divergente. Atualize a consulta.');return sucesso({itens,fim:itens.length<50,...(itens.length===50?{cursor:itens.at(-1)!.resultVersion}:{})})}catch(e){return erroFatura(e)}}
 async function identificacao(id:string){try{const c=await card(id),s=await getDocFromServer(doc(db,'users',ctx.uid,'titulares',c.titularId));check();const h=s.exists()?decodeCadastro(ctx.uid,'titulares',c.titularId,s.data()):undefined;return sucesso({cartao:c,titularNome:h?h.dados.nome+(h.dados.estado==='arquivado'?' (arquivado)':''):'Titular indisponível'})}catch(e){return erroFatura(e)}}
 return {prever,obter,periodo,listar,historico,identificacao}
}
function dadosCalendario(f:Fatura){return {competencia:f.competencia,inicio:f.inicio,fechamento:f.fechamento,vencimento:f.vencimento,calendarioOrigem:f.calendarioOrigem}}
