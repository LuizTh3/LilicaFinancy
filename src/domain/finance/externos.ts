import { camposPermitidos, falha, registro, sucesso } from './errors'
import type { Resultado } from './errors'
import { dataCalendario } from './calendar'
import { idCadastroValido } from './cadastros'
import { comandoExternoValido, dadosExternosValidos, eventoExternoId } from './externosValidation'
import type { ComandoExterno, DadosExterno, EventoExterno, OrigemExterna } from './contracts/externos'

export type ReferenciaExterna = Readonly<{id:string;uid:string;colecao:'categorias'|'titulares'|'contas'|'etiquetas';estado:'ativo'|'arquivado';natureza?:'receita'|'despesa'}>
export type ContextoCriacaoExterna = Readonly<{uid:string;agora:number;referencias:readonly ReferenciaExterna[]}>
export function normalizarComandoExterno(input:unknown,hoje:string):Resultado<ComandoExterno> {
 if(!registro(input)||!dataCalendario(hoje).ok)return falha('valorInvalido','Informe uma operação financeira válida.')
 const command={...input}
 if('dados'in command) {
  if(!registro(command.dados))return falha('valorInvalido','Informe os dados do lançamento.')
  const d={...command.dados}
  if(typeof d.descricao==='string')d.descricao=d.descricao.trim()
  if(d.estimado===undefined)d.estimado=false
  for(const key of ['observacao','titularId','contaPrevistaId'])if(typeof d[key]==='string'&&!d[key].trim())delete d[key]
  if(typeof d.observacao==='string')d.observacao=d.observacao.trim()
  if(Array.isArray(d.etiquetaIds)){if(d.etiquetaIds.length===0)delete d.etiquetaIds;else if(d.etiquetaIds.every(idCadastroValido))d.etiquetaIds=[...d.etiquetaIds].sort()}
  if(!dadosExternosValidos(d))return falha('valorInvalido','Confira valor, descrição, categoria, etiquetas e datas do lançamento.',{recuperacao:'corrigir'})
  command.dados=d
 }
 if(typeof command.motivo==='string')command.motivo=command.motivo.trim()
 if(!comandoExternoValido(command))return falha('valorInvalido','Operação, referência ou versão inválida.',{recuperacao:'corrigir'})
 if('dataEfetiva'in command&&command.dataEfetiva>hoje)return falha('dataInvalida','Pagamento ou recebimento real não pode ter data futura.',{campo:'dataEfetiva'})
 if(new TextEncoder().encode(JSON.stringify(command)).length>16384)return falha('limiteOperacional','A operação excede 16 KiB. Reduza os dados.',{limite:16384})
 return sucesso(command)
}
export function validarReferenciasExternas(dados:DadosExterno,ctx:ContextoCriacaoExterna,antes?:DadosExterno):Resultado<true> {
 const targets:[ReferenciaExterna['colecao'],string,boolean][]=[['categorias',dados.categoriaId,antes?.categoriaId===dados.categoriaId]]
 if(dados.titularId)targets.push(['titulares',dados.titularId,antes?.titularId===dados.titularId])
 if(dados.contaPrevistaId)targets.push(['contas',dados.contaPrevistaId,antes?.contaPrevistaId===dados.contaPrevistaId])
 for(const id of dados.etiquetaIds??[])targets.push(['etiquetas',id,antes?.etiquetaIds?.includes(id)??false])
 for(const [colecao,id,historical] of targets) {
  const matches=ctx.referencias.filter(r=>r.colecao===colecao&&r.id===id&&r.uid===ctx.uid)
  if(matches.length!==1||(matches[0].estado!=='ativo'&&!historical)||(colecao==='categorias'&&matches[0].natureza!==dados.natureza))return falha('referenciaInvalida','Selecione cadastros ativos da sua conta e categoria da natureza correta.',{recuperacao:'corrigir'})
 }
 return sucesso(true)
}
export function planejarCriacaoExterna(command:ComandoExterno,ctx:ContextoCriacaoExterna):Resultado<{origem:OrigemExterna;evento:EventoExterno}> {
 if(!comandoExternoValido(command)||!['criarReceita','criarDespesa'].includes(command.tipo)||!('dados'in command)||!ctx.uid||!Number.isFinite(ctx.agora)||ctx.agora<0||!Array.isArray(ctx.referencias))return falha('valorInvalido','Criação de previsão inválida.')
 if('substituiOrigemId'in command)return falha('limiteOperacional','A criação substituta exige o fluxo de correção e seu perfil de validação.')
 const refs=validarReferenciasExternas(command.dados,ctx);if(!refs.ok)return refs
 const id=eventoExternoId(command.tipo,command.operationKey)
 const origem:OrigemExterna={...structuredClone(command.dados),id:command.origemId,uid:ctx.uid,schemaVersion:1,version:1,createdAt:ctx.agora,updatedAt:ctx.agora,estadoObrigacao:'ativa',liquidadoLiquidoCentavos:0,jaLiquidada:false,ultimoEventoId:id}
 const evento:EventoExterno={id,uid:ctx.uid,schemaVersion:1,contractVersion:1,tipo:command.tipo,operationKey:command.operationKey,origemId:command.origemId,natureza:command.dados.natureza,expectedVersion:0,resultVersion:1,comando:structuredClone(command),depois:structuredClone(command.dados),createdAt:ctx.agora}
 return sucesso({origem,evento})
}
export function descritorExternoValido(value:unknown):boolean {
 return registro(value)&&camposPermitidos(value,['uid','contractVersion','operationKey','origemId','expectedVersion','tipo'])&&typeof value.uid==='string'&&!!value.uid&&value.contractVersion===1&&idCadastroValido(value.operationKey)&&idCadastroValido(value.origemId)&&Number.isSafeInteger(value.expectedVersion)&&Number(value.expectedVersion)>=0&&!!eventoExternoIdSeguro(value.tipo,value.operationKey)
}
function eventoExternoIdSeguro(tipo:unknown,key:string) {
 return typeof tipo==='string'&&['criarReceita','criarDespesa','gastoImediato','editarOrigem','cancelarOrigem','receber','pagar','reverterRecebimento','reverterPagamento'].includes(tipo)?tipo+'__'+key:undefined
}
