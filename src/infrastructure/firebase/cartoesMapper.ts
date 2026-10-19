import { Timestamp } from 'firebase/firestore'
import { camposPermitidos, registro, versaoValida } from '../../domain/finance/errors'
import { dadosCartaoIguais, dadosDoCartao, descreverCartao, eventoCartaoId, idCartaoValido, validarComandoCartao, validarDadosCartao } from '../../domain/finance/cartoes'
import type { Cartao, DadosCartao, ReciboCartao } from '../../domain/finance/contracts/cartoes'
const bad=():never=>{throw Object.assign(new Error('Formato de cartão incompatível. Nenhum dado foi alterado.'),{code:'schema'})}
function business(raw:unknown):DadosCartao & {estado:'ativo'|'arquivado'} {
 if(!registro(raw)||!camposPermitidos(raw,['banco','nome','titularId','diaFechamento','diaVencimento','estado'])||!['ativo','arquivado'].includes(raw.estado as string))return bad()
 const {estado,...dados}=raw,result=validarDadosCartao(dados)
 if(!result.ok||!dadosCartaoIguais(result.valor,dados as DadosCartao))return bad()
 return {...result.valor,estado:estado as 'ativo'|'arquivado'}
}
export function decodeCartao(uid:string,id:string,value:unknown):Cartao {
 if(!uid||!idCartaoValido(id)||!registro(value)||!camposPermitidos(value,['banco','nome','titularId','diaFechamento','diaVencimento','estado','schemaVersion','version','ultimoEventoId','createdAt','updatedAt','archivedAt'])||value.schemaVersion!==1||!versaoValida(value.version)||typeof value.ultimoEventoId!=='string'||!/^(criarCartao|editarCartao|arquivarCartao)__[A-Za-z0-9-]{1,64}$/.test(value.ultimoEventoId)||!(value.createdAt instanceof Timestamp)||!(value.updatedAt instanceof Timestamp))return bad()
 const data=business({...dadosDoCartao(value as unknown as DadosCartao),estado:value.estado})
 if(value.updatedAt.toMillis()<value.createdAt.toMillis()||(data.estado==='arquivado'?!(value.archivedAt instanceof Timestamp)||value.archivedAt.toMillis()!==value.updatedAt.toMillis():'archivedAt'in value))return bad()
 return {...data,id,uid,schemaVersion:1,version:value.version,ultimoEventoId:value.ultimoEventoId,createdAt:value.createdAt.toMillis(),updatedAt:value.updatedAt.toMillis(),...(value.archivedAt instanceof Timestamp?{archivedAt:value.archivedAt.toMillis()}:{})}
}
export function decodeReciboCartao(eventId:string,value:unknown):ReciboCartao {
 if(!registro(value)||!camposPermitidos(value,['schemaVersion','contractVersion','operationKey','tipo','alvoId','expectedVersion','resultVersion','comando','resultado','antes','createdAt'])||value.schemaVersion!==1||value.contractVersion!==1||!(value.createdAt instanceof Timestamp)||!versaoValida(value.resultVersion))return bad()
 const command=validarComandoCartao(value.comando)
 if(!command.ok)return bad()
 const c=command.valor,d=descreverCartao(c)
 if(eventId!==eventoCartaoId(d)||value.operationKey!==d.operationKey||value.alvoId!==d.alvoId||value.expectedVersion!==d.expectedVersion||value.resultVersion!==d.expectedVersion+1||value.tipo!==d.tipo)return bad()
 if(c.tipo!=='arquivarCartao'&&(!registro(value.comando)||!dadosCartaoIguais(c.payload,value.comando.payload as DadosCartao)))return bad()
 const result=business(value.resultado)
 if(c.tipo==='arquivarCartao'?result.estado!=='arquivado':result.estado!=='ativo'||!dadosCartaoIguais(result,c.payload))return bad()
 const before='antes'in value?business(value.antes):undefined
 if(c.tipo==='criarCartao'?before!==undefined:!before||before.estado!=='ativo')return bad()
 if(c.tipo==='arquivarCartao'&&before&&!dadosCartaoIguais(before,result))return bad()
 if(c.tipo==='editarCartao'&&before&&dadosCartaoIguais(before,result))return bad()
 return {schemaVersion:1,contractVersion:1,operationKey:d.operationKey,tipo:d.tipo,alvoId:d.alvoId,expectedVersion:d.expectedVersion,resultVersion:value.resultVersion,comando:c,resultado:result,...(before?{antes:before}:{}),createdAt:value.createdAt.toMillis()}
}
