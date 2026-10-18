import { camposPermitidos, registro, texto } from './errors'
import { competencia, dataCalendario } from './calendar'
import { valorPositivo } from './money'
import { idCadastroValido } from './cadastros'
import { tiposExternos } from './contracts/externos'
import type { ComandoExterno, DadosExterno, FatoExterno, TipoExterno } from './contracts/externos'

export const camposDadosExternos = ['natureza','descricao','categoriaId','valorCentavos','estimado','competenciaPlanejamento','dataPrevista','vencimento','dataConsumo','titularId','contaPrevistaId','etiquetaIds','observacao'] as const
export function eventoExternoId(tipo: TipoExterno, chave: string) { return tipo+'__'+chave }
export function tipoEventoExterno(id: unknown): TipoExterno | undefined {
 if(typeof id!=='string') return undefined
 const parts=id.split('__')
 return parts.length===2&&tiposExternos.includes(parts[0] as TipoExterno)&&idCadastroValido(parts[1])?parts[0] as TipoExterno:undefined
}
export const textoCanonico = (value: unknown,max: number): value is string => texto(value,max)&&value===value.trim()
export function dadosExternosValidos(value: unknown): value is DadosExterno {
 if(!registro(value)||!camposPermitidos(value,camposDadosExternos)||!textoCanonico(value.descricao,120)||!idCadastroValido(value.categoriaId)||!valorPositivo(value.valorCentavos).ok||typeof value.estimado!=='boolean'||!competencia(value.competenciaPlanejamento).ok) return false
 if(value.natureza==='receita') { if(!dataCalendario(value.dataPrevista).ok||'vencimento'in value||'dataConsumo'in value)return false }
 else if(value.natureza==='despesa') { if(!dataCalendario(value.vencimento).ok||!dataCalendario(value.dataConsumo).ok||'dataPrevista'in value)return false }
 else return false
 for(const key of ['titularId','contaPrevistaId']) if(key in value&&!idCadastroValido(value[key]))return false
 if('observacao'in value&&!textoCanonico(value.observacao,1000))return false
 if('etiquetaIds'in value) {
  const labels=value.etiquetaIds
  if(!Array.isArray(labels)||labels.length<1||labels.length>5||!labels.every(idCadastroValido)||new Set(labels).size!==labels.length||labels.some((id,i)=>i>0&&id<=labels[i-1]))return false
 }
 return true
}
export function comandoExternoValido(value: unknown): value is ComandoExterno {
 if(!registro(value)||value.contractVersion!==1||!idCadastroValido(value.operationKey)||!idCadastroValido(value.origemId)||!Number.isSafeInteger(value.expectedVersion)||Number(value.expectedVersion)<0||Number(value.expectedVersion)>=Number.MAX_SAFE_INTEGER||!tiposExternos.includes(value.tipo as TipoExterno))return false
 const create=['criarReceita','criarDespesa','gastoImediato'].includes(String(value.tipo))
 if(create?value.expectedVersion!==0:Number(value.expectedVersion)<1)return false
 const base=['contractVersion','operationKey','origemId','expectedVersion','tipo']
 const withData=create||value.tipo==='editarOrigem'
 const liquid=value.tipo==='pagar'||value.tipo==='receber'||value.tipo==='gastoImediato'
 const reverse=value.tipo==='reverterPagamento'||value.tipo==='reverterRecebimento'
 const keys=[...base,...(withData?['dados']:[]),...(create?['substituiOrigemId']:[]),...(liquid?['dataEfetiva','contaId']:[]),...(['pagar','receber'].includes(String(value.tipo))?['valorCentavos']:[]),...(reverse?['originalId','motivo']:value.tipo==='cancelarOrigem'?['motivo']:[])]
 if(!camposPermitidos(value,keys))return false
 if(withData&&(!dadosExternosValidos(value.dados)||(value.tipo==='criarReceita'&&value.dados.natureza!=='receita')||(['criarDespesa','gastoImediato'].includes(String(value.tipo))&&value.dados.natureza!=='despesa')))return false
 if('substituiOrigemId'in value&&(!idCadastroValido(value.substituiOrigemId)||value.substituiOrigemId===value.origemId))return false
 if(liquid&&(!dataCalendario(value.dataEfetiva).ok||!idCadastroValido(value.contaId)))return false
 if(['pagar','receber'].includes(String(value.tipo))&&!valorPositivo(value.valorCentavos).ok)return false
 if((reverse||value.tipo==='cancelarOrigem')&&!textoCanonico(value.motivo,1000))return false
 if(reverse) {
  const original=tipoEventoExterno(value.originalId)
  if(value.tipo==='reverterPagamento'?!['pagar','gastoImediato'].includes(String(original)):original!=='receber')return false
 }
 return true
}
export function fatoExternoValido(value: unknown): value is FatoExterno {
 if(!registro(value)||!valorPositivo(value.valorCentavos).ok||!dataCalendario(value.dataEfetiva).ok||!idCadastroValido(value.contaId))return false
 const reverse=value.tipo==='reversaoPagamento'||value.tipo==='reversaoRecebimento'
 if(!reverse&&value.tipo!=='pagamento'&&value.tipo!=='recebimento')return false
 if(!camposPermitidos(value,['tipo','valorCentavos','dataEfetiva','contaId',...(reverse?['originalId','motivo']:[])]))return false
 if(reverse) {
  if(!textoCanonico(value.motivo,1000))return false
  const original=tipoEventoExterno(value.originalId)
  if(value.tipo==='reversaoPagamento'?!['pagar','gastoImediato'].includes(String(original)):original!=='receber')return false
 }
 return true
}
export function conteudoExternoIgual(a: unknown,b: unknown): boolean {
 const canonical=(v: unknown): unknown => Array.isArray(v)?v.map(canonical):registro(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v
 return JSON.stringify(canonical(a))===JSON.stringify(canonical(b))
}
