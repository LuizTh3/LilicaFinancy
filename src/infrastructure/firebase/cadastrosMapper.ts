import { Timestamp } from 'firebase/firestore'
import { camposPermitidos, registro } from '../../domain/finance/errors'
import { validarDadosCadastro, conteudoIgual, idCadastroValido, descritorValido, reciboId, colecaoValida } from '../../domain/finance/cadastros'
import type { Cadastro, Colecao, DadosCadastro, ReciboCadastro } from '../../domain/finance/contracts/cadastros'
const metadados=['schemaVersion','version','createdAt','updatedAt','archivedAt']
export const conteudoDocumento = (d: Record<string,unknown>) => Object.fromEntries(Object.entries(d).filter(([k])=>!metadados.includes(k)))
export function decodeCadastro(uid: string,c: Colecao,id: string,value: unknown): Cadastro {
 if(!idCadastroValido(id)||!registro(value)||value.schemaVersion!==1||!Number.isSafeInteger(value.version)||Number(value.version)<1||!(value.createdAt instanceof Timestamp)||!(value.updatedAt instanceof Timestamp)) throw Object.assign(new Error('Cadastro incompatível.'),{code:'schema'})
 const raw=conteudoDocumento(value), data=validarDadosCadastro(c,raw,'9999-12-31')
 if(!data.ok||!conteudoIgual(data.valor,raw as DadosCadastro)||value.updatedAt.toMillis()<value.createdAt.toMillis()||(data.valor.estado==='arquivado'?!(value.archivedAt instanceof Timestamp)||value.archivedAt.toMillis()!==value.updatedAt.toMillis():'archivedAt'in value)) throw Object.assign(new Error('Cadastro incompatível.'),{code:'schema'})
 return {id,uid,colecao:c,dados:data.valor,schemaVersion:1,version:Number(value.version),createdAt:value.createdAt.toMillis(),updatedAt:value.updatedAt.toMillis(),...(value.archivedAt instanceof Timestamp?{archivedAt:value.archivedAt.toMillis()}:{})}
}
export function decodeRecibo(value: unknown): ReciboCadastro {
 if(!registro(value)||!camposPermitidos(value,['schemaVersion','operationKey','colecao','cadastroId','expectedVersion','version','tipo','dados','createdAt'])||value.schemaVersion!==1||!(value.createdAt instanceof Timestamp)) throw Object.assign(new Error('Recibo incompatível.'),{code:'schema'})
 if(!colecaoValida(value.colecao)||!idCadastroValido(value.cadastroId)||!Number.isSafeInteger(value.version)||value.version!==Number(value.expectedVersion)+1) throw Object.assign(new Error('Recibo incompatível.'),{code:'schema'})
 const descriptor={operationKey:value.operationKey,colecao:value.colecao,cadastroId:value.cadastroId,tipo:value.tipo,expectedVersion:value.expectedVersion,reciboId:reciboId(value.colecao,value.cadastroId,Number(value.version))}
 const data=validarDadosCadastro(value.colecao,value.dados,'9999-12-31')
 if(!descritorValido(descriptor)||!data.ok||!registro(value.dados)||!conteudoIgual(data.valor,value.dados as DadosCadastro)||data.valor.estado!==(value.tipo==='arquivar'?'arquivado':'ativo')) throw Object.assign(new Error('Recibo incompatível.'),{code:'schema'})
 return {...value,createdAt:value.createdAt.toMillis()} as ReciboCadastro
}
export function contextoConta(c: Cadastro) {
 if(c.colecao!=='contas') throw new Error('Conta esperada.')
 return {id:c.id,uid:c.uid,estadoCadastro:c.dados.estado}
}
