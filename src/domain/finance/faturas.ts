import { avancarCompetencia, competencia, dataCalendario } from './calendar'
import { calendarioBaseFatura, validarCalendarioFatura } from './invoiceCalendar'
import type { CalendarioFaturaV2 } from './invoiceCalendar'
import { idCartaoValido } from './cartoes'
import type { Cartao } from './contracts/cartoes'
import type { ComandoFatura, DescritorFatura, Fatura } from './contracts/faturas'
import { camposPermitidos, falha, registro, sucesso, versaoValida } from './errors'
import type { Resultado } from './errors'
const invalid=()=>falha('referenciaInvalida','Calendário ou referências da fatura inconsistentes.',{recuperacao:'reler'})
const exact=(v:Record<string,unknown>,keys:readonly string[])=>camposPermitidos(v,keys)&&keys.every(k=>k in v)
export const faturaId=(card:string,month:string)=>`${card}__${month}`
export function identidadeFaturaValida(value:unknown):value is string {if(typeof value!=='string')return false;const p=value.split('__');return p.length===2&&idCartaoValido(p[0])&&competencia(p[1]).ok}
export function dadosFatura(f:CalendarioFaturaV2 & {cartaoId:string}) {return {cartaoId:f.cartaoId,competencia:f.competencia,inicio:f.inicio,fechamento:f.fechamento,vencimento:f.vencimento,calendarioOrigem:{calendarVersion:2 as const,cartaoVersion:f.calendarioOrigem.cartaoVersion,diaFechamento:f.calendarioOrigem.diaFechamento,diaVencimento:f.calendarioOrigem.diaVencimento,vencimentoOriginal:f.calendarioOrigem.vencimentoOriginal,origemInicio:f.calendarioOrigem.origemInicio,origemFechamento:f.calendarioOrigem.origemFechamento}}}
export function calendariosIguais(a:CalendarioFaturaV2,b:CalendarioFaturaV2){return JSON.stringify(dadosFatura({...a,cartaoId:''}))===JSON.stringify(dadosFatura({...b,cartaoId:''}))}
export function descritorFaturaValido(v:unknown):v is DescritorFatura {return registro(v)&&exact(v,['contractVersion','tipo','operationKey','alvoId','expectedVersion'])&&v.contractVersion===1&&['confirmarFatura','ajustarVencimento'].includes(v.tipo as string)&&idCartaoValido(v.operationKey)&&identidadeFaturaValida(v.alvoId)&&typeof v.expectedVersion==='number'&&Number.isSafeInteger(v.expectedVersion)&&v.expectedVersion>=0&&v.expectedVersion<Number.MAX_SAFE_INTEGER&&(v.tipo==='confirmarFatura'?v.expectedVersion===0:v.expectedVersion>0)}
export function descreverFatura(c:ComandoFatura):DescritorFatura {return {contractVersion:1,tipo:c.tipo,operationKey:c.operationKey,alvoId:c.alvoId,expectedVersion:c.expectedVersion}}
export const eventoFaturaId=(d:DescritorFatura)=>`${d.tipo}__${d.operationKey}`
function comandoNormalizado(c:ComandoFatura):Resultado<ComandoFatura>{return new TextEncoder().encode(JSON.stringify(c)).length<=16384?sucesso(c):falha('limiteOperacional','A operação excede 16 KiB.',{limite:16384})}
export function validarComandoFatura(input:unknown):Resultado<ComandoFatura> {
 if(!registro(input)||!exact(input,['contractVersion','tipo','operationKey','alvoId','expectedVersion','payload']))return invalid()
 const {payload,...d}=input
 if(!descritorFaturaValido(d)||!registro(payload))return invalid()
 const base={contractVersion:1 as const,tipo:d.tipo,operationKey:d.operationKey,alvoId:d.alvoId,expectedVersion:d.expectedVersion}
 if(d.tipo==='ajustarVencimento'){
  if(!exact(payload,['vencimento','motivo'])||!dataCalendario(payload.vencimento).ok||typeof payload.motivo!=='string'||!payload.motivo.trim()||[...payload.motivo.trim()].length>1000)return falha('valorInvalido','Informe data válida e motivo de 1 a 1000 caracteres.',{recuperacao:'corrigir'})
  return comandoNormalizado({...base,tipo:'ajustarVencimento',payload:{vencimento:payload.vencimento as string,motivo:payload.motivo.trim()}})
 }
 if(!exact(payload,['cartaoId','cartaoVersion','competencia','inicio','fechamento','vencimento','calendarioOrigem'])||!idCartaoValido(payload.cartaoId)||!versaoValida(payload.cartaoVersion)||d.alvoId!==faturaId(payload.cartaoId,payload.competencia as string))return invalid()
 const valid=validarCalendarioFatura(payload)
 if(!valid.ok||!valid.valor.calendarioOrigem||payload.cartaoVersion!==valid.valor.calendarioOrigem.cartaoVersion)return invalid()
 return comandoNormalizado({...base,tipo:'confirmarFatura',payload:{...dadosFatura({...valid.valor,cartaoId:payload.cartaoId}),cartaoVersion:payload.cartaoVersion}})
}
export function competenciasVizinhas(month:string):readonly string[] {return [-2,-1,1,2].flatMap(n=>{const m=avancarCompetencia(month,n);return m.ok?[m.valor]:[]})}
function snapshotValido(f:Fatura):boolean {return registro(f)&&exact(f,['uid','id','cartaoId','competencia','inicio','fechamento','vencimento','calendarioOrigem','schemaVersion','versaoConteudo','version','ultimoEventoId','createdAt','updatedAt'])&&f.id===faturaId(f.cartaoId,f.competencia)&&f.schemaVersion===1&&f.versaoConteudo===1&&validarCalendarioFatura(f).ok&&versaoValida(f.version)}
function snapshotsValidos(c:Cartao,neighbors:readonly Fatura[]):boolean {return neighbors.every(f=>snapshotValido(f)&&f.uid===c.uid&&f.cartaoId===c.id)}
export function construirFatura(c:Cartao,month:string,neighbors:readonly Fatura[]=[]):Resultado<CalendarioFaturaV2> {
 if(!snapshotsValidos(c,neighbors))return invalid()
 const base=calendarioBaseFatura(month,c.diaFechamento,c.diaVencimento,c.version)
 if(!base.ok)return base
 const get=(offset:number)=>{const m=avancarCompetencia(month,offset);return m.ok?neighbors.find(f=>f.competencia===m.valor):undefined}
 const prev=get(-1),next=get(1),prev2=get(-2),next2=get(2)
 const candidate={...base.valor,inicio:prev?.fechamento??base.valor.inicio,fechamento:next?.inicio??base.valor.fechamento,calendarioOrigem:{...base.valor.calendarioOrigem,origemInicio:prev?'vizinhoConfirmado' as const:'padrao' as const,origemFechamento:next?'vizinhoConfirmado' as const:'padrao' as const}}
 const valid=validarCalendarioFatura(candidate)
 if(!valid.ok||!valid.valor.calendarioOrigem||prev2&&prev2.fechamento>candidate.inicio||next2&&candidate.fechamento>next2.inicio)return invalid()
 return sucesso(candidate)
}
export function planejarConfirmacaoFatura(input:unknown,c:Cartao,before:Fatura|undefined,neighbors:readonly Fatura[]):Resultado<{estado:'novo'|'existente';dados:CalendarioFaturaV2 & {cartaoId:string}}> {
 const valid=validarComandoFatura(input)
 if(!valid.ok)return valid
 const cmd=valid.valor
 if(cmd.tipo!=='confirmarFatura'||cmd.payload.cartaoId!==c.id)return invalid()
 const proposed=dadosFatura(cmd.payload)
 if(before){if(before.uid!==c.uid||before.id!==cmd.alvoId||!snapshotsValidos(c,[before]))return invalid();return calendariosIguais(before,proposed)?sucesso({estado:'existente',dados:dadosFatura(before)}):falha('conflitoVersao','Este período já possui outro calendário. Releia a fatura.',{recuperacao:'reler'})}
 if(c.estado!=='ativo')return falha('referenciaInvalida','Cartão arquivado não permite confirmar novos períodos.')
 if(cmd.payload.cartaoVersion!==c.version)return falha('conflitoVersao','O cartão mudou desde a prévia. Confira o calendário novamente.',{recuperacao:'reler'})
 const expected=construirFatura(c,cmd.payload.competencia,neighbors)
 if(!expected.ok)return expected
 if(!calendariosIguais(expected.valor,proposed)||proposed.vencimento!==proposed.calendarioOrigem.vencimentoOriginal)return invalid()
 return sucesso({estado:'novo',dados:proposed})
}
export function planejarAjusteVencimento(input:unknown,f:Fatura):Resultado<{dados:CalendarioFaturaV2 & {cartaoId:string};semAlteracao:boolean}> {
 const valid=validarComandoFatura(input)
 if(!valid.ok)return valid
 const c=valid.valor
 if(c.tipo!=='ajustarVencimento'||c.alvoId!==f.id||!snapshotValido(f))return invalid()
 if(c.expectedVersion!==f.version)return falha('conflitoVersao','A fatura mudou. Releia antes de ajustar.',{recuperacao:'reler'})
 const date=dataCalendario(c.payload.vencimento)
 if(!date.ok)return date
 const proposed={...dadosFatura(f),vencimento:date.valor},calendar=validarCalendarioFatura(proposed)
 return calendar.ok?sucesso({dados:proposed,semAlteracao:date.valor===f.vencimento}):falha('dataInvalida','O vencimento deve permanecer no mês da fatura e respeitar o fechamento.',{campo:'vencimento',recuperacao:'corrigir'})
}
export function cicloFatura(f:CalendarioFaturaV2,hoje:string):Resultado<'aberta'|'fechada'> {const date=dataCalendario(hoje);return date.ok?sucesso(date.valor<f.fechamento?'aberta':'fechada'):date}
export function resolverPrimeiraFatura(c:Cartao,data:string,snapshots:readonly Fatura[],escolha?:string):Resultado<{estado:'sugestao'|'escolhaExplicita'|'ausencia'|'conflito';calendario?:CalendarioFaturaV2;candidatos:readonly CalendarioFaturaV2[]}> {
 const date=dataCalendario(data)
 if(!date.ok)return date
 if(c.estado!=='ativo')return falha('referenciaInvalida','Cartão arquivado não permite prévia de nova compra.')
 if(!snapshotsValidos(c,snapshots))return invalid()
 const unique=new Map<string,Fatura>()
 for(const f of snapshots){const old=unique.get(f.id);if(old&&(old.version!==f.version||!calendariosIguais(old,f)))return falha('integridadeIndeterminada','As leituras divergem. Atualize a prévia.',{recuperacao:'reler'});unique.set(f.id,f)}
 const all=[...unique.values()]
 if(escolha!==undefined){if(!competencia(escolha).ok)return invalid();const found=all.find(f=>f.competencia===escolha),out=found?sucesso<CalendarioFaturaV2>(found):construirFatura(c,escolha,all);return out.ok?sucesso({estado:'escolhaExplicita',calendario:out.valor,candidatos:[out.valor]}):out}
 const candidates=new Map<string,CalendarioFaturaV2>()
 for(const f of all)if(f.inicio<=date.valor&&date.valor<f.fechamento)candidates.set(f.competencia,f)
 for(const offset of [0,1,2]){const m=avancarCompetencia(date.valor.slice(0,7),offset);if(!m.ok||all.some(f=>f.competencia===m.valor))continue;const out=construirFatura(c,m.valor,all);if(out.ok&&out.valor.inicio<=date.valor&&date.valor<out.valor.fechamento)candidates.set(m.valor,out.valor)}
 const values=[...candidates.values()]
 return sucesso({estado:values.length===1?'sugestao':values.length?'conflito':'ausencia',...(values.length===1?{calendario:values[0]}:{}),candidatos:values})
}
