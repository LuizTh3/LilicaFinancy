import { collection, doc, documentId, getDocFromServer, getDocsFromServer, limit, orderBy, query, runTransaction, serverTimestamp, startAfter, where } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { falha, registro, sucesso } from '../../domain/finance/errors'
import type { CodigoErro, Resultado } from '../../domain/finance/errors'
import { dadosDoCartao, descreverCartao, descritorCartaoValido, eventoCartaoId, idCartaoValido, planejarCartao, validarComandoCartao } from '../../domain/finance/cartoes'
import type { ComandoCartao, ConsultaCartao, DescritorCartao, EstadoOperacaoCartao, PortaCartoes, ReciboCartao, ResultadoCartao } from '../../domain/finance/contracts/cartoes'
import { decodeCartao, decodeReciboCartao } from './cartoesMapper'
import { decodeCadastro } from './cadastrosMapper'
export type ContextoCartoes={uid:string;generation:number;atual:()=>boolean}
function abort(codigo:CodigoErro,mensagem:string):never {throw Object.assign(Error(mensagem),{dominio:codigo})}
function failure(e:unknown) {
 const code=registro(e)?e.code:e instanceof Error?(e as Error & {code?:string}).code:undefined
 const domain=e instanceof Error?(e as Error & {dominio?:CodigoErro}).dominio:undefined
 const codigo:CodigoErro=domain??(code==='schema'?'esquemaIncompativel':code==='permission-denied'||code==='unauthenticated'?'semPermissao':code==='failed-precondition'?'configuracaoPendente':code==='resource-exhausted'?'cotaExcedida':code==='aborted'?'conflitoVersao':'indisponivel')
 const messages:Partial<Record<CodigoErro,string>>={esquemaIncompativel:'O formato do cartão não é compatível. Nenhum dado foi alterado.',semPermissao:'Verifique sua sessão e seu acesso.',configuracaoPendente:'A consulta ou operação depende da configuração do banco ou de um índice. Contate o responsável.',cotaExcedida:'Cota temporariamente excedida. Consulte a mesma operação antes de repetir.',conflitoVersao:'Os dados mudaram. Releia antes de confirmar.',indisponivel:'Não foi possível confirmar a conexão. Consulte a mesma operação antes de repetir.'}
 const mensagem=code==='permission-denied'?'O banco recusou o acesso aos cartões. Confira com o responsável se as regras de cartões estão publicadas e se sua sessão tem acesso.':messages[codigo]??'Não foi possível concluir a operação.'
 return falha(codigo,domain&&e instanceof Error?e.message:mensagem,{recuperacao:codigo==='semPermissao'?'verificarAcesso':codigo==='conflitoVersao'||codigo==='configuracaoPendente'?'reler':'repetirMesmaChave'}) as Extract<Resultado<never>,{ok:false}>
}
export function createCartoesRepository(db:Firestore,ctx:ContextoCartoes,afterCommit?:()=>Promise<void>):PortaCartoes {
 const check=()=>{if(!ctx.uid||!ctx.atual())abort('semPermissao','A sessão mudou. Entre novamente.')}
 const cardRef=(id:string)=>{check();if(!idCartaoValido(id))abort('valorInvalido','Identificador de cartão inválido.');return doc(db,'users',ctx.uid,'cartoes',id)}
 const receiptRef=(d:DescritorCartao)=>doc(db,'users',ctx.uid,'operacoesCartoes',eventoCartaoId(d))
 const confirm=(raw:unknown,d:DescritorCartao,c?:ComandoCartao):ReciboCartao=>{
  const r=decodeReciboCartao(eventoCartaoId(d),raw)
  if(r.operationKey!==d.operationKey||r.tipo!==d.tipo||r.alvoId!==d.alvoId||r.expectedVersion!==d.expectedVersion)abort('conflitoIdempotencia','A chave já confirmou outra intenção. Confira o resultado anterior.')
  if(c&&JSON.stringify(r.comando)!==JSON.stringify(c))abort('conflitoIdempotencia','A chave já confirmou outro conteúdo. Confira o resultado anterior.')
  return r
 }
 async function consultarOperacao(input:ConsultaCartao) {
  try{
   check();if(!registro(input)||!['comandoCompleto','descritor'].includes(input.modo))abort('valorInvalido','Consulta de operação inválida.')
   let command:ComandoCartao|undefined
   if(input.modo==='comandoCompleto'){const v=validarComandoCartao(input.comando);if(!v.ok)return v;command=v.valor}
   const d=command?descreverCartao(command):input.modo==='descritor'?input.descritor:undefined
   if(!descritorCartaoValido(d))abort('valorInvalido','Descritor inválido.')
   const s=await getDocFromServer(receiptRef(d));check()
   if(!s.exists())return sucesso<EstadoOperacaoCartao>({estado:'ausenteConfirmado'})
   const r=confirm(s.data(),d,command)
   return sucesso<EstadoOperacaoCartao>({estado:'confirmado',alvoId:r.alvoId,resultVersion:r.resultVersion,eventoId:eventoCartaoId(d),verificacao:input.modo,resultado:r.resultado})
  }catch(e){const out=failure(e);return out.erro.codigo==='indisponivel'?sucesso<EstadoOperacaoCartao>({estado:'indeterminado'}):out}
 }
 return {
  consultarOperacao,
  async executar(input){
   let command:ComandoCartao|undefined
   try{
    check();const valid=validarComandoCartao(input);if(!valid.ok)return valid;command=valid.valor
    const c=command,d=descreverCartao(c),target=cardRef(c.alvoId),receipt=receiptRef(d)
    const result=await runTransaction(db,async tx=>{
     check();const r=await tx.get(receipt)
     if(r.exists()){const previous=confirm(r.data(),d,c);return {estado:'confirmado',alvoId:previous.alvoId,resultVersion:previous.resultVersion,eventoId:eventoCartaoId(d)} as ResultadoCartao}
     const s=await tx.get(target),before=s.exists()?decodeCartao(ctx.uid,c.alvoId,s.data()):undefined
     const holder=c.tipo==='arquivarCartao'?undefined:await tx.get(doc(db,'users',ctx.uid,'titulares',c.payload.titularId))
     const h=holder?.exists()&&c.tipo!=='arquivarCartao'?decodeCadastro(ctx.uid,'titulares',c.payload.titularId,holder.data()):undefined
     const plan=planejarCartao(c,before,h?{id:h.id,uid:h.uid,estado:h.dados.estado}:undefined,ctx.uid)
     if(!plan.ok)abort(plan.erro.codigo,plan.erro.mensagem)
     check()
     if(plan.valor.semAlteracao)return {estado:'semAlteracao',alvoId:c.alvoId,resultVersion:before!.version} as ResultadoCartao
     const version=c.expectedVersion+1
     tx.set(target,{...plan.valor.dados,schemaVersion:1,version,ultimoEventoId:eventoCartaoId(d),createdAt:s.exists()?s.data().createdAt:serverTimestamp(),updatedAt:serverTimestamp(),...(c.tipo==='arquivarCartao'?{archivedAt:serverTimestamp()}:{})})
     tx.set(receipt,{schemaVersion:1,contractVersion:1,operationKey:c.operationKey,tipo:c.tipo,alvoId:c.alvoId,expectedVersion:c.expectedVersion,resultVersion:version,comando:c,resultado:plan.valor.dados,...(before?{antes:{...dadosDoCartao(before),estado:before.estado}}:{}),createdAt:serverTimestamp()})
     return {estado:'confirmado',alvoId:c.alvoId,resultVersion:version,eventoId:eventoCartaoId(d)} as ResultadoCartao
    })
    if(afterCommit&&result.estado==='confirmado')await afterCommit()
    check();return sucesso(result)
   }catch(e){
    const out=failure(e)
    if(command&&ctx.atual()&&['indisponivel','cotaExcedida'].includes(out.erro.codigo)){
     const recovered=await consultarOperacao({modo:'comandoCompleto',comando:command})
     if(recovered.ok&&recovered.valor.estado==='confirmado')return sucesso({estado:'confirmado' as const,alvoId:recovered.valor.alvoId,resultVersion:recovered.valor.resultVersion,eventoId:recovered.valor.eventoId})
     if(!recovered.ok)return recovered
     return falha('confirmacaoIndeterminada','Sem confirmação remota. Consulte a mesma intenção antes de reenviar.',{recuperacao:'repetirMesmaChave'})
    }
    return out
   }
  },
  async obter(id){try{const s=await getDocFromServer(cardRef(id));check();return s.exists()?sucesso(decodeCartao(ctx.uid,id,s.data())):falha('naoEncontrado','Cartão não encontrado.')}catch(e){return failure(e)}},
  async listar(filtro,pagina=50,cursor){try{
   check();if(!['ativo','arquivado','todos'].includes(filtro)||!Number.isInteger(pagina)||pagina<1||pagina>50)abort('valorInvalido','Consulta inválida.')
   if(cursor&&(cursor.uid!==ctx.uid||cursor.generation!==ctx.generation||cursor.filtro!==filtro||typeof cursor.nome!=='string'||!idCartaoValido(cursor.id)))abort('valorInvalido','Cursor de outra consulta ou sessão.')
   const q=query(collection(db,'users',ctx.uid,'cartoes'),...(filtro==='todos'?[]:[where('estado','==',filtro)]),orderBy('nome','asc'),orderBy(documentId(),'asc'),...(cursor?[startAfter(cursor.nome,cursor.id)]:[]),limit(pagina))
   const s=await getDocsFromServer(q);check();const itens=s.docs.map(v=>decodeCartao(ctx.uid,v.id,v.data())),last=itens.at(-1),fim=itens.length<pagina
   return sucesso({itens,fim,...(!fim&&last?{cursor:{uid:ctx.uid,generation:ctx.generation,filtro,nome:last.nome,id:last.id}}:{})})
  }catch(e){return failure(e)}}
 }
}
