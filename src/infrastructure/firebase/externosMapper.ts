import { Timestamp } from 'firebase/firestore'
import { camposPermitidos, registro, versaoValida } from '../../domain/finance/errors'
import { idCadastroValido } from '../../domain/finance/cadastros'
import { camposDadosExternos, comandoExternoValido, conteudoExternoIgual, dadosExternosValidos, eventoExternoId, fatoExternoValido, textoCanonico, tipoEventoExterno } from '../../domain/finance/externosValidation'
import type { DadosExterno, EventoExterno, MarcadorReversaoExterna, OrigemExterna } from '../../domain/finance/contracts/externos'
import type { CompromissoPlanejamento, OrigemConsumo, ReceitaPlanejamento, FatoLiquidacao } from '../../domain/finance/contracts/commands'

function incompatible(): never { throw Object.assign(new Error('Registro financeiro incompatível. Nenhuma alteração foi feita.'),{code:'schema'}) }
const timestamp=(v: unknown): v is Timestamp=>v instanceof Timestamp&&Number.isFinite(v.toMillis())&&v.toMillis()>=0
const dados=(v: Record<string,unknown>)=>Object.fromEntries(Object.entries(v).filter(([k])=>(camposDadosExternos as readonly string[]).includes(k)))
function size(value: unknown) { if(new TextEncoder().encode(JSON.stringify(value)).length>32768)incompatible() }
function identity(uid: string,id: string) { if(!uid||!idCadastroValido(id))incompatible() }
export function decodeOrigemExterna(uid: string,id: string,value: unknown): OrigemExterna {
 identity(uid,id)
 const meta=['schemaVersion','version','createdAt','updatedAt','estadoObrigacao','liquidadoLiquidoCentavos','jaLiquidada','ultimoEventoId','substituiOrigemId','canceledAt','cancelamentoMotivo']
 if(!registro(value)||!camposPermitidos(value,[...camposDadosExternos,...meta])||value.schemaVersion!==1||!versaoValida(value.version)||!timestamp(value.createdAt)||!timestamp(value.updatedAt)||value.updatedAt.toMillis()<value.createdAt.toMillis())incompatible()
 const business=dados(value)
 if(!dadosExternosValidos(business)||!['ativa','cancelada'].includes(String(value.estadoObrigacao))||!Number.isSafeInteger(value.liquidadoLiquidoCentavos)||Number(value.liquidadoLiquidoCentavos)<0||Number(value.liquidadoLiquidoCentavos)>business.valorCentavos||typeof value.jaLiquidada!=='boolean'||!tipoEventoExterno(value.ultimoEventoId))incompatible()
 if(!value.jaLiquidada&&value.liquidadoLiquidoCentavos!==0)incompatible()
 if(value.version===1&&(value.jaLiquidada?(business.natureza!=='despesa'||value.liquidadoLiquidoCentavos!==business.valorCentavos||tipoEventoExterno(value.ultimoEventoId)!=='gastoImediato'):(tipoEventoExterno(value.ultimoEventoId)!==(business.natureza==='receita'?'criarReceita':'criarDespesa'))))incompatible()
 if('substituiOrigemId'in value&&(!idCadastroValido(value.substituiOrigemId)||value.substituiOrigemId===id))incompatible()
 if(value.estadoObrigacao==='cancelada') {
  if(value.liquidadoLiquidoCentavos!==0||!timestamp(value.canceledAt)||value.canceledAt.toMillis()!==value.updatedAt.toMillis()||!textoCanonico(value.cancelamentoMotivo,1000))incompatible()
 } else if('canceledAt'in value||'cancelamentoMotivo'in value)incompatible()
 size(value)
 return {...structuredClone(business),id,uid,schemaVersion:1,version:value.version,createdAt:value.createdAt.toMillis(),updatedAt:value.updatedAt.toMillis(),estadoObrigacao:value.estadoObrigacao as 'ativa'|'cancelada',liquidadoLiquidoCentavos:Number(value.liquidadoLiquidoCentavos),jaLiquidada:value.jaLiquidada,ultimoEventoId:String(value.ultimoEventoId),...('substituiOrigemId'in value?{substituiOrigemId:String(value.substituiOrigemId)}:{}),...(timestamp(value.canceledAt)?{canceledAt:value.canceledAt.toMillis(),cancelamentoMotivo:String(value.cancelamentoMotivo)}:{})}
}
export function decodeEventoExterno(uid: string,id: string,value: unknown): EventoExterno {
 if(!uid||!tipoEventoExterno(id)||!registro(value)||!camposPermitidos(value,['schemaVersion','contractVersion','tipo','operationKey','origemId','natureza','expectedVersion','resultVersion','comando','antes','depois','fato','createdAt'])||value.schemaVersion!==1||value.contractVersion!==1||!timestamp(value.createdAt)||!comandoExternoValido(value.comando)||!dadosExternosValidos(value.depois))incompatible()
 const c=value.comando,d=value.depois
 if(id!==eventoExternoId(c.tipo,c.operationKey)||value.tipo!==c.tipo||value.operationKey!==c.operationKey||value.origemId!==c.origemId||value.expectedVersion!==c.expectedVersion||value.resultVersion!==c.expectedVersion+1||value.natureza!==d.natureza)incompatible()
 if('dados'in c&&!conteudoExternoIgual(c.dados,d))incompatible()
 if(c.tipo==='editarOrigem'||c.tipo==='cancelarOrigem') { if(!dadosExternosValidos(value.antes)||value.antes.natureza!==d.natureza)incompatible() }
 else if('antes'in value)incompatible()
 if(c.tipo==='cancelarOrigem'&&!conteudoExternoIgual(value.antes,d))incompatible()
 const fact=value.fato
 if(['pagar','receber','gastoImediato','reverterPagamento','reverterRecebimento'].includes(c.tipo)) {
  if(!fatoExternoValido(fact))incompatible()
  const expected=c.tipo==='receber'?'recebimento':c.tipo==='reverterRecebimento'?'reversaoRecebimento':c.tipo==='reverterPagamento'?'reversaoPagamento':'pagamento'
  if(fact.tipo!==expected||(d.natureza==='receita'?!['recebimento','reversaoRecebimento'].includes(fact.tipo):!['pagamento','reversaoPagamento'].includes(fact.tipo)))incompatible()
  if(c.tipo==='pagar'||c.tipo==='receber'||c.tipo==='gastoImediato') {
   if(fact.contaId!==c.contaId||fact.dataEfetiva!==c.dataEfetiva||fact.valorCentavos!==(c.tipo==='gastoImediato'?c.dados.valorCentavos:c.valorCentavos))incompatible()
  } else if(c.tipo==='reverterPagamento'||c.tipo==='reverterRecebimento') {
   if(fact.originalId!==c.originalId||fact.motivo!==c.motivo)incompatible()
  }
 } else if('fato'in value)incompatible()
 size(value)
 if(new TextEncoder().encode(JSON.stringify(c)).length>16384)incompatible()
 return {...structuredClone({...value,createdAt:value.createdAt.toMillis()}),id,uid} as EventoExterno
}
export function decodeMarcadorExterno(uid: string,id: string,value: unknown): MarcadorReversaoExterna {
 const type=tipoEventoExterno(id)
 if(!uid||!['pagar','receber','gastoImediato'].includes(String(type))||!registro(value)||!camposPermitidos(value,['schemaVersion','origemId','originalId','reversaoEventoId','createdAt'])||value.schemaVersion!==1||!idCadastroValido(value.origemId)||value.originalId!==id||!timestamp(value.createdAt)||tipoEventoExterno(value.reversaoEventoId)!==(type==='receber'?'reverterRecebimento':'reverterPagamento'))incompatible()
 return {id,uid,schemaVersion:1,origemId:value.origemId,originalId:id,reversaoEventoId:String(value.reversaoEventoId),createdAt:value.createdAt.toMillis()}
}
export function dadosOrigemExterna(origem: OrigemExterna): DadosExterno { return dados(origem) as DadosExterno }
export function contextoPlanejamentoExterno(origem: OrigemExterna): {receita?:ReceitaPlanejamento;origem?:OrigemConsumo;compromisso?:CompromissoPlanejamento} {
 const base={id:origem.id,uid:origem.uid,valorCentavos:origem.valorCentavos,competenciaPlanejamento:origem.competenciaPlanejamento,estadoObrigacao:origem.estadoObrigacao}
 if(origem.natureza==='receita')return {receita:{...base,dataPrevista:origem.dataPrevista,estimado:origem.estimado}}
 return {origem:{id:origem.id,uid:origem.uid,tipo:'obrigacaoExterna',origemDados:'nova',categoriaId:origem.categoriaId,estadoObrigacao:origem.estadoObrigacao,valorTotalCentavos:origem.valorCentavos,dataConsumo:origem.dataConsumo,...(origem.etiquetaIds?{etiquetaIds:origem.etiquetaIds}:{})},compromisso:{...base,origemId:origem.id,tipo:'obrigacaoExternaAvulsa',vencimento:origem.vencimento}}
}
export function contextoFatoExterno(evento: EventoExterno): FatoLiquidacao | undefined {
 if(!evento.fato)return undefined
 return {id:evento.id,uid:evento.uid,schemaVersion:1,version:1,alvo:{tipo:evento.natureza==='receita'?'receita':'obrigacaoExternaAvulsa',id:evento.origemId},operacaoId:evento.id,...evento.fato}
}
