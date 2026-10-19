import { doc, getDocFromServer, runTransaction, serverTimestamp } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { competenciasVizinhas, descreverFatura, descritorFaturaValido, eventoFaturaId, faturaId, planejarAjusteVencimento, planejarConfirmacaoFatura, validarComandoFatura } from '../../domain/finance/faturas'
import { registro, sucesso, falha } from '../../domain/finance/errors'
import type { ComandoFatura, ConsultaFatura, DescritorFatura, EstadoOperacaoFatura, Fatura, PortaFaturas, ResultadoFatura } from '../../domain/finance/contracts/faturas'
import type { ContextoCartoes } from './cartoesRepository'
import { decodeCartao } from './cartoesMapper'
import { decodeFatura, decodeReciboFatura } from './faturasMapper'
import { createFaturasQueries } from './faturasQueries'
import { abortFatura as abort, erroFatura } from './faturasErrors'
export function createFaturasRepository(db:Firestore,ctx:ContextoCartoes,afterCommit?:()=>Promise<void>):PortaFaturas {
 const check=()=>{if(!ctx.uid||!ctx.atual())abort('semPermissao','A sessão mudou. Entre novamente.')}
 const receiptRef=(d:DescritorFatura)=>doc(db,'users',ctx.uid,'operacoesFaturas',eventoFaturaId(d))
 function confirm(raw:unknown,d:DescritorFatura,c?:ComandoFatura){const r=decodeReciboFatura(eventoFaturaId(d),raw);if(r.operationKey!==d.operationKey||r.tipo!==d.tipo||r.alvoId!==d.alvoId||r.expectedVersion!==d.expectedVersion||c&&JSON.stringify(c)!==JSON.stringify(r.comando))abort('conflitoIdempotencia','A chave já confirmou outra intenção ou conteúdo. Confira o recibo.');return r}
 async function consultarOperacao(input:ConsultaFatura){try{check();if(!registro(input)||!['comandoCompleto','descritor'].includes(input.modo))abort('valorInvalido','Consulta inválida.');let c:ComandoFatura|undefined;if(input.modo==='comandoCompleto'){const v=validarComandoFatura(input.comando);if(!v.ok)return v;c=v.valor}const d=c?descreverFatura(c):input.modo==='descritor'?input.descritor:undefined;if(!descritorFaturaValido(d))abort('valorInvalido','Descritor inválido.');const s=await getDocFromServer(receiptRef(d));check();if(!s.exists())return sucesso<EstadoOperacaoFatura>({estado:'ausenteConfirmado'});const r=confirm(s.data(),d,c);return sucesso<EstadoOperacaoFatura>({estado:'confirmado',alvoId:r.alvoId,resultVersion:r.resultVersion,eventoId:eventoFaturaId(d),resultado:r.resultado,verificacao:input.modo})}catch(e){const out=erroFatura(e);return out.erro.codigo==='indisponivel'?sucesso<EstadoOperacaoFatura>({estado:'indeterminado'}):out}}
 const queries=createFaturasQueries(db,ctx)
 return {obter:queries.obter,listar:queries.listar,consultarOperacao,async executar(input){let c:ComandoFatura|undefined
  try{check();const valid=validarComandoFatura(input);if(!valid.ok)return valid;c=valid.valor;const command=c,d=descreverFatura(command),receipt=receiptRef(d),target=doc(db,'users',ctx.uid,'faturas',command.alvoId)
   const result=await runTransaction(db,async tx=>{
    check();const r=await tx.get(receipt)
    if(r.exists()){const previous=confirm(r.data(),d,command);return {estado:'confirmado',alvoId:d.alvoId,resultVersion:previous.resultVersion,eventoId:eventoFaturaId(d)} as ResultadoFatura}
    const s=await tx.get(target),before=s.exists()?decodeFatura(ctx.uid,d.alvoId,s.data()):undefined
    let data:Fatura|ReturnType<typeof decodeReciboFatura>['resultado']
    if(command.tipo==='confirmarFatura'){
     const card=await tx.get(doc(db,'users',ctx.uid,'cartoes',command.payload.cartaoId));if(!card.exists())abort('referenciaInvalida','Cartão não encontrado.')
     const c=decodeCartao(ctx.uid,command.payload.cartaoId,card.data()),neighbors:Fatura[]=[]
     for(const m of competenciasVizinhas(command.payload.competencia)){const id=faturaId(c.id,m),n=await tx.get(doc(db,'users',ctx.uid,'faturas',id));if(n.exists())neighbors.push(decodeFatura(ctx.uid,id,n.data()))}
     const plan=planejarConfirmacaoFatura(command,c,before,neighbors);if(!plan.ok)abort(plan.erro.codigo,plan.erro.mensagem)
     if(plan.valor.estado==='existente')return {estado:'existente',alvoId:d.alvoId,resultVersion:before!.version} as ResultadoFatura
     data=plan.valor.dados
    }else{if(!before)abort('naoEncontrado','Fatura não encontrada.');const plan=planejarAjusteVencimento(command,before);if(!plan.ok)abort(plan.erro.codigo,plan.erro.mensagem);if(plan.valor.semAlteracao)return {estado:'semAlteracao',alvoId:d.alvoId,resultVersion:before.version} as ResultadoFatura;data=plan.valor.dados}
    check();tx.set(target,{...data,schemaVersion:1,versaoConteudo:1,version:d.expectedVersion+1,ultimoEventoId:eventoFaturaId(d),createdAt:s.exists()?s.data().createdAt:serverTimestamp(),updatedAt:serverTimestamp()})
    tx.set(receipt,{schemaVersion:1,contractVersion:1,tipo:d.tipo,operationKey:d.operationKey,alvoId:d.alvoId,expectedVersion:d.expectedVersion,resultVersion:d.expectedVersion+1,comando:command,resultado:data,...(before?{antes:{vencimento:before.vencimento}}:{}),createdAt:serverTimestamp()})
    return {estado:'confirmado',alvoId:d.alvoId,resultVersion:d.expectedVersion+1,eventoId:eventoFaturaId(d)} as ResultadoFatura
   })
   if(afterCommit&&result.estado==='confirmado')await afterCommit();check();return sucesso(result)
  }catch(e){const out=erroFatura(e);if(c&&ctx.atual()&&['indisponivel','cotaExcedida'].includes(out.erro.codigo)){const r=await consultarOperacao({modo:'comandoCompleto',comando:c});if(r.ok&&r.valor.estado==='confirmado')return sucesso<ResultadoFatura>({estado:'confirmado',alvoId:r.valor.alvoId,resultVersion:r.valor.resultVersion,eventoId:r.valor.eventoId});if(!r.ok)return r;return falha('confirmacaoIndeterminada','Sem confirmação remota. Consulte a mesma intenção antes de reenviar.',{recuperacao:'repetirMesmaChave'})}return out}
 }}
}
