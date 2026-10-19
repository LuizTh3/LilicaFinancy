import { camposPermitidos, falha, registro, sucesso } from './errors'
import type { Resultado } from './errors'
import type { Cartao, ComandoCartao, DadosCartao, DescritorCartao } from './contracts/cartoes'
export const idCartaoValido=(id:unknown):id is string=>typeof id==='string'&&/^[A-Za-z0-9-]{1,64}$/.test(id)
export const tiposCartao=['criarCartao','editarCartao','arquivarCartao'] as const
const invalid=(campo?:string)=>falha('valorInvalido','Confira os dados do cartão.',{campo,recuperacao:'corrigir'})
export function validarDadosCartao(input:unknown):Resultado<DadosCartao> {
 if(!registro(input)||!camposPermitidos(input,['banco','nome','titularId','diaFechamento','diaVencimento']))return invalid()
 for(const campo of ['banco','nome'] as const)if(typeof input[campo]!=='string'||input[campo].trim().length===0||[...input[campo].trim()].length>120)return invalid(campo)
 if(!idCartaoValido(input.titularId))return invalid('titularId')
 for(const campo of ['diaFechamento','diaVencimento'] as const)if(typeof input[campo]!=='number'||!Number.isInteger(input[campo])||input[campo]<1||input[campo]>31)return invalid(campo)
 return sucesso({banco:(input.banco as string).trim(),nome:(input.nome as string).trim(),titularId:input.titularId,diaFechamento:input.diaFechamento as number,diaVencimento:input.diaVencimento as number})
}
export function descritorCartaoValido(input:unknown):input is DescritorCartao {
 return registro(input)&&camposPermitidos(input,['contractVersion','tipo','operationKey','alvoId','expectedVersion'])&&input.contractVersion===1&&tiposCartao.includes(input.tipo as typeof tiposCartao[number])&&idCartaoValido(input.operationKey)&&idCartaoValido(input.alvoId)&&typeof input.expectedVersion==='number'&&Number.isSafeInteger(input.expectedVersion)&&input.expectedVersion>=0&&input.expectedVersion<Number.MAX_SAFE_INTEGER&&(input.tipo==='criarCartao'?input.expectedVersion===0:input.expectedVersion>0)
}
export function descreverCartao(c:ComandoCartao):DescritorCartao {return {contractVersion:1,tipo:c.tipo,operationKey:c.operationKey,alvoId:c.alvoId,expectedVersion:c.expectedVersion}}
export const eventoCartaoId=(c:DescritorCartao)=>`${c.tipo}__${c.operationKey}`
function comandoNormalizado(c:ComandoCartao):Resultado<ComandoCartao>{return new TextEncoder().encode(JSON.stringify(c)).length<=16384?sucesso(c):falha('limiteOperacional','A operação excede 16 KiB.',{limite:16384})}
export function validarComandoCartao(input:unknown):Resultado<ComandoCartao> {
 if(!registro(input)||!camposPermitidos(input,['contractVersion','tipo','operationKey','alvoId','expectedVersion','payload']))return invalid()
 const {payload,...descriptor}=input
 if(!descritorCartaoValido(descriptor))return invalid()
 const base=descreverCartao({...descriptor,payload:{}} as ComandoCartao)
 if(descriptor.tipo==='arquivarCartao')return registro(payload)&&Object.keys(payload).length===0?comandoNormalizado({...base,tipo:'arquivarCartao',payload:{}}):invalid()
 const data=validarDadosCartao(payload)
 return data.ok?comandoNormalizado({...base,tipo:descriptor.tipo,payload:data.valor}):data
}
export function dadosDoCartao(c:DadosCartao):DadosCartao {return {banco:c.banco,nome:c.nome,titularId:c.titularId,diaFechamento:c.diaFechamento,diaVencimento:c.diaVencimento}}
export const dadosCartaoIguais=(a:DadosCartao,b:DadosCartao)=>JSON.stringify(dadosDoCartao(a))===JSON.stringify(dadosDoCartao(b))
export function planejarCartao(input:unknown,before:Cartao|undefined,holder:{id:string;uid:string;estado:'ativo'|'arquivado'}|undefined,uid:string):Resultado<{dados:DadosCartao & {estado:'ativo'|'arquivado'};semAlteracao:boolean}> {
 const valid=validarComandoCartao(input)
 if(!valid.ok)return valid
 const c=valid.valor
 if(before&&before.schemaVersion!==1)return falha('esquemaIncompativel','O formato do cartão não é compatível.')
 if((before?.version??0)!==c.expectedVersion||before&&(before.uid!==uid||before.id!==c.alvoId))return falha('conflitoVersao','O cartão mudou. Releia os dados antes de confirmar.',{recuperacao:'reler'})
 if(c.tipo==='arquivarCartao')return before?sucesso({dados:{...dadosDoCartao(before),estado:'arquivado'},semAlteracao:before.estado==='arquivado'}):falha('naoEncontrado','Cartão não encontrado.')
 if(before?.estado==='arquivado')return falha('referenciaInvalida','Cartão arquivado não permite edição.')
 if(!holder||holder.id!==c.payload.titularId||holder.uid!==uid||holder.estado!=='ativo'&&before?.titularId!==holder.id)return falha('referenciaInvalida','Selecione um titular ativo da sua conta.',{campo:'titularId',recuperacao:'corrigir'})
 return sucesso({dados:{...c.payload,estado:'ativo'},semAlteracao:!!before&&dadosCartaoIguais(before,c.payload)})
}
