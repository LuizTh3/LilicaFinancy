import { falha } from '../../domain/finance/errors'
import type { CodigoErro, Resultado } from '../../domain/finance/errors'
export function abortFatura(codigo:CodigoErro,mensagem:string):never {throw Object.assign(Error(mensagem),{dominio:codigo})}
export function erroFatura(e:unknown):Extract<Resultado<never>,{ok:false}> {
 const value=e as {code?:string;dominio?:CodigoErro;message?:string}|undefined
 const codigo=value?.dominio??(value?.code==='schema'?'esquemaIncompativel':['permission-denied','unauthenticated'].includes(value?.code??'')?'semPermissao':value?.code==='failed-precondition'?'configuracaoPendente':value?.code==='resource-exhausted'?'cotaExcedida':value?.code==='aborted'?'conflitoVersao':'indisponivel')
 const mensagem=value?.dominio&&e instanceof Error?e.message:codigo==='esquemaIncompativel'?'Formato de fatura incompatível. Nenhum dado foi alterado.':codigo==='semPermissao'?'Verifique sua sessão e seu acesso.':codigo==='configuracaoPendente'?'Consulta depende da configuração do banco ou de um índice. Contate o responsável.':codigo==='conflitoVersao'?'Os dados mudaram. Releia antes de confirmar.':codigo==='cotaExcedida'?'Cota excedida temporariamente. Consulte a mesma intenção antes de repetir.':'Não foi possível confirmar a conexão. Consulte a mesma intenção antes de repetir.'
 return falha(codigo,mensagem,{recuperacao:codigo==='semPermissao'?'verificarAcesso':['conflitoVersao','configuracaoPendente','esquemaIncompativel'].includes(codigo)?'reler':'repetirMesmaChave'}) as Extract<Resultado<never>,{ok:false}>
}
