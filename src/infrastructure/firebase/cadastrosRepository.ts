import { collection, doc, documentId, getDocFromServer, getDocsFromServer, limit, orderBy, query, runTransaction, serverTimestamp, startAfter, where } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { falha, registro, sucesso } from '../../domain/finance/errors'
import type { CodigoErro, Resultado } from '../../domain/finance/errors'
import { colecaoValida, conteudoIgual, descrever, descritorValido, idCadastroValido, planejarCadastro, validarComandoCadastro } from '../../domain/finance/cadastros'
import type { Colecao, ComandoCadastro, ConsultaOperacaoCadastro, CursorCadastro, EstadoConsulta, FiltroCadastro, PortaCadastros, ResultadoMutacao } from '../../domain/finance/contracts/cadastros'
import { decodeCadastro, decodeRecibo } from './cadastrosMapper'
export type ContextoCadastros = { uid: string; atual: () => boolean; hoje: () => string }
function abortar(codigo: CodigoErro,mensagem: string): never { throw Object.assign(new Error(mensagem),{dominio:codigo}) }
function erro(e: unknown) {
 const code=registro(e)?e.code: e instanceof Error? (e as Error & {code?:string}).code : undefined
 const dominio=e instanceof Error?(e as Error & {dominio?:CodigoErro}).dominio:undefined
 const codigo: CodigoErro=dominio??(code==='schema'?'esquemaIncompativel':code==='permission-denied'||code==='unauthenticated'?'semPermissao':code==='failed-precondition'?'configuracaoPendente':code==='resource-exhausted'?'cotaExcedida':code==='aborted'?'conflitoVersao':'indisponivel')
 // Inspect the SDK message only to classify an index failure. Do not expose its
 // console URL, project identifier or query details in the user-facing message.
 const detalhe=e instanceof Error?e.message:registro(e)&&typeof e.message==='string'?e.message:''
 const indicePendente=code==='failed-precondition'&&/\bindex\b/i.test(detalhe)
 const message=dominio&&e instanceof Error?e.message
  :codigo==='esquemaIncompativel'?'Cadastro incompatível. Não foi alterado.'
  :codigo==='semPermissao'?'Não foi possível autorizar a operação. Verifique sua sessão.'
  :codigo==='configuracaoPendente'?(indicePendente?'A consulta depende de um índice do banco ainda indisponível. Solicite a configuração ao responsável e recarregue quando estiver pronta.':'O banco ainda não está pronto para esta operação. Contate o responsável pela configuração.')
  :codigo==='cotaExcedida'?'Cota temporariamente excedida. Tente novamente depois.'
  :code==='unavailable'||code==='deadline-exceeded'?'Não foi possível consultar os dados. Verifique a conexão e tente novamente.'
  :'Não foi possível concluir a operação. Tente novamente; se persistir, contate o responsável.'
 return falha(codigo,message,{recuperacao:codigo==='conflitoVersao'||codigo==='configuracaoPendente'?'reler':codigo==='semPermissao'?'verificarAcesso':'repetirMesmaChave'}) as Extract<Resultado<never>,{ok:false}>
}
export function createCadastrosRepository(db: Firestore,ctx: ContextoCadastros,afterCommit?:()=>Promise<void>): PortaCadastros {
 const check=()=>{if(!ctx.uid||!ctx.atual()) abortar('semPermissao','A sessão mudou. Entre novamente.')}
 const ref=(c: Colecao,id:string)=>{check();if(!colecaoValida(c)||!idCadastroValido(id)) abortar('valorInvalido','Identificador inválido.');return doc(db,'users',ctx.uid,c,id)}
 const receiptRef=(id:string)=>doc(db,'users',ctx.uid,'operacoesCadastros',id)
 const controlRef=(c:Colecao,id:string)=>doc(db,'users',ctx.uid,'usoCadastros',`${c}__${id}`)
 const confirmar=(value:unknown,descriptor:ReturnType<typeof descrever>,comando?:ComandoCadastro)=>{
  const r=decodeRecibo(value)
  if(r.operationKey!==descriptor.operationKey) abortar('conflitoVersao','Outra operação alterou esta versão. Releia o cadastro.')
  if(r.colecao!==descriptor.colecao||r.cadastroId!==descriptor.cadastroId||r.tipo!==descriptor.tipo||r.expectedVersion!==descriptor.expectedVersion||r.version!==descriptor.expectedVersion+1) abortar('esquemaIncompativel','Recibo incompatível com a intenção.')
  if(comando&&!conteudoIgual(r.dados,comando.dados)) abortar('conflitoIdempotencia','A chave já confirmou outro conteúdo. Confira o resultado anterior.')
  return r
 }
 async function consultarOperacao(input: ConsultaOperacaoCadastro): Promise<Resultado<EstadoConsulta>> {
  try {
   check()
   if(!registro(input)||!['comandoCompleto','descritor'].includes(input.modo)) abortar('valorInvalido','Modo de consulta inválido.')
   let command: ComandoCadastro|undefined
   if(input.modo==='comandoCompleto') {const valid=validarComandoCadastro(input.comando,ctx.hoje());if(!valid.ok)return valid;command=valid.valor}
   const d=command?descrever(command):input.modo==='descritor'?input.descritor:undefined
   if(!descritorValido(d)) abortar('valorInvalido','Descritor inválido.')
   const snapshot=await getDocFromServer(receiptRef(d.reciboId));check()
   if(!snapshot.exists()) return sucesso({estado:'ausenteConfirmado'})
   const r=confirmar(snapshot.data(),d,command)
   return sucesso({estado:'confirmado',cadastroId:r.cadastroId,version:r.version,reciboId:d.reciboId,verificacao:input.modo,dados:r.dados})
  } catch(e) {const failure=erro(e);return failure.erro.codigo==='indisponivel'?sucesso({estado:'indeterminado'}):failure}
 }
 return {
  consultarOperacao,
  async executar(input) {
   let command: ComandoCadastro|undefined
   try {
    check();const valid=validarComandoCadastro(input,ctx.hoje());if(!valid.ok)return valid;command=valid.valor
    const c=command,d=descrever(c),target=ref(c.colecao,c.cadastroId),rRef=receiptRef(d.reciboId)
    const result=await runTransaction(db,async tx=>{
     check();const receipt=await tx.get(rRef)
     if(receipt.exists()) {const r=confirmar(receipt.data(),d,c);return {estado:'confirmado',cadastroId:r.cadastroId,version:r.version,reciboId:d.reciboId} as ResultadoMutacao}
     const snapshot=await tx.get(target)
     const previous=snapshot.exists()?decodeCadastro(ctx.uid,c.colecao,c.cadastroId,snapshot.data()):undefined
     if((previous?.version??0)!==c.expectedVersion) abortar('conflitoVersao','O cadastro mudou. Releia antes de salvar.')
     const sensitive=c.colecao==='contas'||c.colecao==='categorias'
     const locked=sensitive?!!previous?.usoFinanceiro||(await tx.get(controlRef(c.colecao,c.cadastroId))).exists():false
     const planned=planejarCadastro(c.colecao,previous?.dados,c.dados,c.tipo,locked)
     if(!planned.ok) abortar(planned.erro.codigo,planned.erro.mensagem)
     // Archival uses the stored content; it cannot smuggle an unrelated edit.
     if(c.tipo==='arquivar'&&!conteudoIgual(planned.valor,c.dados)) abortar('valorInvalido','Arquivar não permite alterar o conteúdo.')
     if(c.colecao==='contas'&&planned.valor.titularId) {
      const holder=await tx.get(ref('titulares',planned.valor.titularId))
      const h=holder.exists()?decodeCadastro(ctx.uid,'titulares',planned.valor.titularId,holder.data()):undefined
      if(!h||(h.dados.estado!=='ativo'&&previous?.dados.titularId!==h.id)) abortar('referenciaInvalida','Selecione um titular ativo da sua conta.')
     }
     check()
     if(previous&&conteudoIgual(previous.dados,planned.valor)) return {estado:'semAlteracao',cadastroId:previous.id,version:previous.version} as ResultadoMutacao
     const v=c.expectedVersion+1
     tx.set(target,{...planned.valor,schemaVersion:previous?.schemaVersion??(sensitive?2:1),version:v,createdAt:previous?snapshot.data()!.createdAt:serverTimestamp(),updatedAt:serverTimestamp(),...(planned.valor.estado==='arquivado'?{archivedAt:serverTimestamp()}:{}),...(previous?.usoFinanceiro?{usoFinanceiro:snapshot.data()!.usoFinanceiro}:{})})
     tx.set(rRef,{schemaVersion:1,operationKey:c.operationKey,colecao:c.colecao,cadastroId:c.cadastroId,expectedVersion:c.expectedVersion,version:v,tipo:c.tipo,dados:planned.valor,createdAt:serverTimestamp()})
     return {estado:'confirmado',cadastroId:c.cadastroId,version:v,reciboId:d.reciboId} as ResultadoMutacao
    })
    if(afterCommit) await afterCommit()
    check();return sucesso(result)
   } catch(e) {
    const failure=erro(e)
    if(command&&['indisponivel','cotaExcedida'].includes(failure.erro.codigo)&&ctx.atual()) {
     const confirmation=await consultarOperacao({modo:'comandoCompleto',comando:command})
     if(confirmation.ok&&confirmation.valor.estado==='confirmado') return sucesso(confirmation.valor)
     if(!confirmation.ok)return confirmation
     return falha('confirmacaoIndeterminada','Sem confirmação remota. Verifique a mesma operação antes de tentar novamente.',{recuperacao:'repetirMesmaChave'})
    }
    return failure
   }
  },
  async obter(c,id) {try{const s=await getDocFromServer(ref(c,id));check();return s.exists()?sucesso(decodeCadastro(ctx.uid,c,id,s.data())):falha('naoEncontrado','Cadastro não encontrado.')}catch(e){return erro(e)}},
  async bloqueado(c,id){try{const target=ref(c,id);if(c!=='contas'&&c!=='categorias')return sucesso(false);const s=await getDocFromServer(target);check();if(s.exists()&&decodeCadastro(ctx.uid,c,id,s.data()).usoFinanceiro)return sucesso(true);const control=await getDocFromServer(controlRef(c,id));check();return sucesso(control.exists())}catch(e){return erro(e)}},
  async listar(c: Colecao,filtro:FiltroCadastro,pageSize=50,cursor?:CursorCadastro) {
   try {
    check();if(!colecaoValida(c)||!['ativo','arquivado','todos'].includes(filtro)||!Number.isInteger(pageSize)||pageSize<1||pageSize>50) abortar('valorInvalido','Consulta inválida.')
    if(cursor&&(cursor.uid!==ctx.uid||cursor.colecao!==c||cursor.filtro!==filtro||typeof cursor.nome!=='string'||!idCadastroValido(cursor.id))) abortar('valorInvalido','Cursor incompatível. Recarregue a lista.')
    const q=query(collection(db,'users',ctx.uid,c),...(filtro==='todos'?[]:[where('estado','==',filtro)]),orderBy('nome','asc'),orderBy(documentId(),'asc'),...(cursor?[startAfter(cursor.nome,cursor.id)]:[]),limit(pageSize))
    const s=await getDocsFromServer(q);check()
    const itens=s.docs.map(x=>decodeCadastro(ctx.uid,c,x.id,x.data())),last=itens.at(-1),fim=itens.length<pageSize
    return sucesso({itens,fim,...(!fim&&last?{cursor:{uid:ctx.uid,colecao:c,filtro,nome:last.dados.nome,id:last.id}}:{})})
   }catch(e){return erro(e)}
  }
 }
}
