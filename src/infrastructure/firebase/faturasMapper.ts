import { Timestamp } from 'firebase/firestore'
import { camposPermitidos, registro, versaoValida } from '../../domain/finance/errors'
import { dadosFatura, eventoFaturaId, faturaId, identidadeFaturaValida, validarComandoFatura } from '../../domain/finance/faturas'
import { validarCalendarioFatura } from '../../domain/finance/invoiceCalendar'
import { dataCalendario } from '../../domain/finance/calendar'
import { idCartaoValido } from '../../domain/finance/cartoes'
import type { Fatura, ReciboFatura } from '../../domain/finance/contracts/faturas'
function bad():never {throw Object.assign(Error('Formato de fatura incompatível. Nenhum dado foi alterado.'),{code:'schema'})}
const exact=(v:Record<string,unknown>,keys:readonly string[])=>camposPermitidos(v,keys)&&keys.every(k=>k in v)
const businessKeys=['cartaoId','competencia','inicio','fechamento','vencimento','calendarioOrigem']
function business(v:unknown):ReciboFatura['resultado'] {
 if(!registro(v)||!exact(v,businessKeys)||!idCartaoValido(v.cartaoId))return bad()
 const valid=validarCalendarioFatura(v)
 if(!valid.ok||!valid.valor.calendarioOrigem)return bad()
 return dadosFatura({...valid.valor,cartaoId:v.cartaoId})
}
export function decodeFatura(uid:string,id:string,v:unknown):Fatura {
 if(!uid||!identidadeFaturaValida(id)||!registro(v)||!exact(v,[...businessKeys,'schemaVersion','versaoConteudo','version','ultimoEventoId','createdAt','updatedAt'])||v.schemaVersion!==1||v.versaoConteudo!==1||!versaoValida(v.version)||typeof v.ultimoEventoId!=='string'||!/^(confirmarFatura|ajustarVencimento)__[A-Za-z0-9-]{1,64}$/.test(v.ultimoEventoId)||!(v.createdAt instanceof Timestamp)||!(v.updatedAt instanceof Timestamp)||v.updatedAt.toMillis()<v.createdAt.toMillis())return bad()
 const b=business(Object.fromEntries(businessKeys.map(k=>[k,v[k]])))
 if(id!==faturaId(b.cartaoId,b.competencia))return bad()
 return {...b,uid,id,schemaVersion:1,versaoConteudo:1,version:v.version,ultimoEventoId:v.ultimoEventoId,createdAt:v.createdAt.toMillis(),updatedAt:v.updatedAt.toMillis()}
}
export function decodeReciboFatura(id:string,v:unknown):ReciboFatura {
 if(!registro(v)||!camposPermitidos(v,['schemaVersion','contractVersion','operationKey','tipo','alvoId','expectedVersion','resultVersion','comando','resultado','antes','createdAt'])||v.schemaVersion!==1||v.contractVersion!==1||!versaoValida(v.resultVersion)||!(v.createdAt instanceof Timestamp))return bad()
 const valid=validarComandoFatura(v.comando)
 if(!valid.ok)return bad()
 const c=valid.valor,result=business(v.resultado)
 if(id!==eventoFaturaId(c)||v.operationKey!==c.operationKey||v.tipo!==c.tipo||v.alvoId!==c.alvoId||v.expectedVersion!==c.expectedVersion||v.resultVersion!==c.expectedVersion+1||c.alvoId!==faturaId(result.cartaoId,result.competencia))return bad()
 if(JSON.stringify(v.comando)!==JSON.stringify(c)){
  // Firestore maps may reorder keys. Compare normalized values, retaining trim validation.
  const raw=v.comando as Record<string,unknown>,p=raw.payload as Record<string,unknown>
  if(c.tipo==='ajustarVencimento'?p.motivo!==c.payload.motivo:JSON.stringify(dadosFatura(p as unknown as ReciboFatura['resultado']))!==JSON.stringify(dadosFatura(c.payload)))return bad()
 }
 if(c.tipo==='confirmarFatura'){
  if('antes'in v||JSON.stringify(dadosFatura(c.payload))!==JSON.stringify(result)||result.vencimento!==result.calendarioOrigem.vencimentoOriginal)return bad()
 }else{
  if(!registro(v.antes)||!exact(v.antes,['vencimento'])||!dataCalendario(v.antes.vencimento).ok||v.antes.vencimento===result.vencimento||c.payload.vencimento!==result.vencimento||!validarCalendarioFatura({...result,vencimento:v.antes.vencimento}).ok)return bad()
 }
 return {schemaVersion:1,contractVersion:1,operationKey:c.operationKey,tipo:c.tipo,alvoId:c.alvoId,expectedVersion:c.expectedVersion,resultVersion:v.resultVersion,comando:c,resultado:result,...(c.tipo==='ajustarVencimento'?{antes:{vencimento:(v.antes as {vencimento:string}).vencimento}}:{}),createdAt:v.createdAt.toMillis()}
}
