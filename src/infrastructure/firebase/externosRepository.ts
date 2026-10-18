import { doc, getDocFromServer, runTransaction, serverTimestamp } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { falha, sucesso } from '../../domain/finance/errors'
import type { CodigoErro, Resultado } from '../../domain/finance/errors'
import { hojeNoFuso } from '../../domain/finance/calendar'
import { perfilFinanceiroRemoto } from '../../domain/finance/operationBudget'
import { descritorExternoValido, normalizarComandoExterno, planejarCriacaoExterna } from '../../domain/finance/externos'
import type { ReferenciaExterna } from '../../domain/finance/externos'
import { conteudoExternoIgual, eventoExternoId } from '../../domain/finance/externosValidation'
import type { ComandoExterno, ConfirmacaoExterna, ConsultaOperacaoExterna, DescritorExterno, EstadoOperacaoExterna, EventoExterno, PortaExternos } from '../../domain/finance/contracts/externos'
import type { Cadastro } from '../../domain/finance/contracts/cadastros'
import { decodeCadastro } from './cadastrosMapper'
import { decodeEventoExterno } from './externosMapper'
import { createExternosQueries } from './externosQueries'
import { createExternosSnapshotReader } from './externosSnapshotReader'

export type ContextoExternos = {uid:string; generation:number; timezone:string; atual:()=>boolean; token:()=>Promise<string>; agora?:()=>number}
function abortar(codigo:CodigoErro,mensagem:string):never {throw Object.assign(new Error(mensagem),{dominio:codigo})}
function erro(e:unknown) {
 const failure=e as {dominio?:CodigoErro;code?:string}
 const codigo:CodigoErro=failure?.dominio??(failure?.code==='schema'?'esquemaIncompativel':failure?.code==='permission-denied'||failure?.code==='unauthenticated'?'semPermissao':failure?.code==='failed-precondition'?'configuracaoPendente':failure?.code==='resource-exhausted'?'cotaExcedida':'indisponivel')
 return falha(codigo,failure?.dominio&&e instanceof Error?e.message:'Não foi possível confirmar a operação. Preserve a intenção e consulte novamente.',{recuperacao:codigo==='semPermissao'?'verificarAcesso':'repetirMesmaChave'})
}
const confirmacao=(e:EventoExterno):ConfirmacaoExterna=>({estado:'confirmado',eventoId:e.id,origemId:e.origemId,resultVersion:e.resultVersion,...(e.fato?{fatoId:e.id}:{})})

// Only prediction writes are enabled at this stage. Reads of monthly streams
// will be supplied by the fixed-readTime reader in the following task.
export function createExternosRepository(db:Firestore,ctx:ContextoExternos,afterCommit?:()=>Promise<void>):PortaExternos {
 const check=()=>{if(!ctx.uid||!ctx.atual())abortar('semPermissao','A sessão mudou. Entre novamente.')}
 const agora=()=>ctx.agora?.()??Date.now()
 const ref=(collection:string,id:string)=>doc(db,'users',ctx.uid,collection,id)
 let queries:ReturnType<typeof createExternosQueries>|undefined
 const reads=()=>queries??=createExternosQueries(createExternosSnapshotReader({...ctx,projectId:db.app.options.projectId??''}),ctx)
 function normalizar(input:unknown) {
  const today=hojeNoFuso(agora(),ctx.timezone)
  return today.ok?normalizarComandoExterno(input,today.valor):today
 }
 function confirmar(value:unknown,d:DescritorExterno,command?:ComandoExterno) {
  const e=decodeEventoExterno(ctx.uid,eventoExternoId(d.tipo,d.operationKey),value)
  if(e.origemId!==d.origemId||e.expectedVersion!==d.expectedVersion||e.contractVersion!==d.contractVersion||command&&!conteudoExternoIgual(e.comando,command))abortar('conflitoIdempotencia','Esta chave já confirmou outro conteúdo. Consulte o resultado anterior.')
  return e
 }
 async function consultarOperacao(input:ConsultaOperacaoExterna):Promise<Resultado<EstadoOperacaoExterna>> {
  try {
   check();let command:ComandoExterno|undefined
   if(input?.modo==='comandoCompleto'){const valid=normalizar(input.comando);if(!valid.ok)return valid;command=valid.valor}
   const descriptor=command?{uid:ctx.uid,contractVersion:command.contractVersion,operationKey:command.operationKey,origemId:command.origemId,expectedVersion:command.expectedVersion,tipo:command.tipo}:input?.modo==='descritor'?input.descritor:undefined
   if(!descritorExternoValido(descriptor)||descriptor?.uid!==ctx.uid)abortar('valorInvalido','Descritor inválido para esta sessão.')
   const d=descriptor as DescritorExterno
   const snapshot=await getDocFromServer(ref('operacoesExternas',eventoExternoId(d.tipo,d.operationKey)));check()
   if(!snapshot.exists())return sucesso({estado:'ausenteConfirmado'})
   const event=confirmar(snapshot.data(),d,command)
   return sucesso({...confirmacao(event),evento:event,verificacao:input.modo})
  }catch(e){const result=erro(e);return !result.ok&&result.erro.codigo==='indisponivel'?sucesso({estado:'indeterminado'}):result}
 }
 return {
  listar:(q,cursor)=>reads().listar(q,cursor),
  detalhe:(id,size,snapshot,after)=>reads().detalhe(id,size,snapshot,after),
  consultarOperacao,
  async executar(input) {
   let command:ComandoExterno|undefined
   try {
    check();const valid=normalizar(input);if(!valid.ok)return valid;command=valid.valor
    const c=command
    if(c.tipo!=='criarReceita'&&c.tipo!=='criarDespesa')return falha('limiteOperacional','Este comando ainda não está habilitado.')
    if(c.substituiOrigemId)return falha('limiteOperacional','A substituição depende do fluxo de correção.')
    const profile=perfilFinanceiroRemoto(c.tipo)
    if(profile.status==='naoHabilitado'||profile.acessosMaximos>18||profile.acessosPorEscrita.some(n=>n>8))return falha('limiteOperacional','O comando não tem orçamento de validação disponível.')
    const descriptor:DescritorExterno={uid:ctx.uid,contractVersion:1,tipo:c.tipo,operationKey:c.operationKey,origemId:c.origemId,expectedVersion:c.expectedVersion}
    const eventId=eventoExternoId(c.tipo,c.operationKey), receipt=ref('operacoesExternas',eventId)
    // Preflight is advisory. It cannot hide a receipt already confirmed, and
    // Rules revalidate every dependency atomically at commit time.
    let preflightError:unknown,category:Cadastro|undefined
    const references:ReferenciaExterna[]=[]
    try {
     const targets:[ReferenciaExterna['colecao'],string][]=[['categorias',c.dados.categoriaId]]
     if(c.dados.titularId)targets.push(['titulares',c.dados.titularId])
     if(c.dados.contaPrevistaId)targets.push(['contas',c.dados.contaPrevistaId])
     for(const id of c.dados.etiquetaIds??[])targets.push(['etiquetas',id])
     for(const [collection,id] of targets) {
      const snapshot=await getDocFromServer(ref(collection,id));check()
      if(!snapshot.exists())abortar('referenciaInvalida','Selecione cadastros existentes da sua conta.')
      const value=decodeCadastro(ctx.uid,collection,id,snapshot.data())
      references.push({id,uid:ctx.uid,colecao:collection,estado:value.dados.estado,...(value.dados.natureza?{natureza:value.dados.natureza}:{})})
      if(collection==='categorias')category=value
     }
    }catch(e){preflightError=e}
    check()
    const result=await runTransaction(db,async tx=>{
     check();const existing=await tx.get(receipt);check()
     if(existing.exists())return confirmacao(confirmar(existing.data(),descriptor,c))
     if(preflightError)throw preflightError
     const planned=planejarCriacaoExterna(c,{uid:ctx.uid,agora:agora(),referencias:references})
     if(!planned.ok)abortar(planned.erro.codigo,planned.erro.mensagem)
     const {id:_originId,uid:_originUid,...origin}=planned.valor.origem
     const {id:_eventId,uid:_eventUid,...event}=planned.valor.evento
     check()
     tx.set(ref('lancamentosExternos',c.origemId),{...origin,createdAt:serverTimestamp(),updatedAt:serverTimestamp()})
     tx.set(receipt,{...event,createdAt:serverTimestamp()})
     if(category&&!category.usoFinanceiro)tx.update(ref('categorias',category.id),{schemaVersion:2,usoFinanceiro:{eventoId:eventId,origemId:c.origemId,papel:'classificacao',createdAt:serverTimestamp()}})
     return confirmacao(planned.valor.evento)
    })
    await afterCommit?.();check();return sucesso(result)
   }catch(e){
    if(command&&ctx.atual()) {
     const lookup=await consultarOperacao({modo:'comandoCompleto',comando:command})
     if(lookup.ok&&lookup.valor.estado==='confirmado')return sucesso(confirmacao(lookup.valor.evento))
     if(lookup.ok&&lookup.valor.estado==='indeterminado')return falha('confirmacaoIndeterminada','Resultado incerto. Consulte a mesma intenção antes de tentar outra chave.',{recuperacao:'repetirMesmaChave'})
     if(!lookup.ok&&lookup.erro.codigo==='conflitoIdempotencia')return lookup
    }
    return erro(e)
   }
  }
 }
}
