import { descritorFaturaValido, faturaId } from '../../domain/finance/faturas'
import type { Cartao } from '../../domain/finance/contracts/cartoes'
import type { ComandoFatura, DescritorFatura } from '../../domain/finance/contracts/faturas'
import type { CalendarioFaturaV2 } from '../../domain/finance/invoiceCalendar'
import { lerIntencaoPendente } from './cartoesState'
export function lerFaturaPendente(raw:string|null,uid:string):DescritorFatura|undefined {const d=lerIntencaoPendente(raw,uid);return descritorFaturaValido(d)?d:undefined}
export function comandoConfirmar(c:Cartao,calendario:CalendarioFaturaV2,key:string):ComandoFatura {return {contractVersion:1,tipo:'confirmarFatura',operationKey:key,alvoId:faturaId(c.id,calendario.competencia),expectedVersion:0,payload:{...calendario,cartaoId:c.id,cartaoVersion:c.version}}}
export function rotaIntencao(d:{tipo:string;alvoId:string}){const [id,month]=d.alvoId.split('__');return d.tipo==='confirmarFatura'||d.tipo==='ajustarVencimento'?`/app/cartoes/${encodeURIComponent(id)}/faturas/${encodeURIComponent(month)}`:'/app/cartoes'}
