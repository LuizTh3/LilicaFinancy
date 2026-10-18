import { camposPermitidos, falha, registro, sucesso } from './errors'
import type { Resultado } from './errors'
import { dataCalendario } from './calendar'
import { centavos } from './money'
import { colecoes } from './contracts/cadastros'
import type { Colecao, ComandoCadastro, DadosCadastro, DescritorCadastro, TipoOperacaoCadastro, UsoFinanceiro } from './contracts/cadastros'
export const idCadastroValido = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(id)
export const colecaoValida = (value: unknown): value is Colecao => typeof value === 'string' && (colecoes as readonly string[]).includes(value)
export const camposBaseConta = ['saldoInicialCentavos','saldoInicialPosicao','saldoInicialDataBase'] as const
export function usoFinanceiroValido(c: Colecao, value: unknown): value is UsoFinanceiro {
 if(!registro(value)||!camposPermitidos(value,['eventoId','origemId','papel','createdAt'])||!idCadastroValido(value.origemId)||typeof value.createdAt!=='number'||!Number.isFinite(value.createdAt)||value.createdAt<0) return false
 const pattern=c==='categorias'?/^(criarReceita|criarDespesa|gastoImediato|editarOrigem)__[A-Za-z0-9-]{1,64}$/:c==='contas'?/^(receber|pagar|gastoImediato)__[A-Za-z0-9-]{1,64}$/:undefined
 return !!pattern&&typeof value.eventoId==='string'&&pattern.test(value.eventoId)&&value.papel===(c==='categorias'?'classificacao':'movimentacao')
}
export const camposConteudo = (c: Colecao) => ['nome','estado', ...(c==='categorias'?['natureza']:c==='contas'?['tipo','titularId',...camposBaseConta]:[])]
export const conteudoIgual = (a: DadosCadastro,b: DadosCadastro) => JSON.stringify(Object.entries(a).sort())===JSON.stringify(Object.entries(b).sort())
export function validarDadosCadastro(c: unknown, input: unknown, hoje: string): Resultado<DadosCadastro> {
 if(!colecaoValida(c)||!registro(input)||!camposPermitidos(input,camposConteudo(c))) return falha('valorInvalido','O cadastro contém campos não permitidos.')
 if(typeof input.nome!=='string'||!input.nome.trim()||[...input.nome.trim()].length>120) return falha('valorInvalido','Informe um nome de 1 a 120 caracteres.',{campo:'nome'})
 if(input.estado!=='ativo'&&input.estado!=='arquivado') return falha('valorInvalido','Estado de cadastro inválido.')
 if(c==='categorias'&&(typeof input.natureza!=='string'||!['receita','despesa'].includes(input.natureza))) return falha('valorInvalido','Selecione receita ou despesa.',{campo:'natureza'})
 if(c==='contas') {
  if(typeof input.tipo!=='string'||!['banco','carteira','contaPagamento'].includes(input.tipo)) return falha('valorInvalido','Selecione um tipo de conta.',{campo:'tipo'})
  if('titularId'in input&&!idCadastroValido(input.titularId)) return falha('referenciaInvalida','Selecione um titular válido.',{campo:'titularId'})
  const n=camposBaseConta.filter(k=>k in input).length
  if(n!==0) {
   if(n!==3) return falha('valorInvalido','Informe valor, posição e data-base juntos.',{campo:'saldoInicialDataBase'})
   const money=centavos(input.saldoInicialCentavos); if(!money.ok) return {...money,erro:{...money.erro,campo:'saldoInicialCentavos'}}
   if(typeof input.saldoInicialPosicao!=='string'||!['credora','devedora'].includes(input.saldoInicialPosicao)||(money.valor===0&&input.saldoInicialPosicao!=='credora')) return falha('valorInvalido','Zero exige posição credora.',{campo:'saldoInicialPosicao'})
   const date=dataCalendario(input.saldoInicialDataBase)
   if(!date.ok||!dataCalendario(hoje).ok||date.valor>hoje) return falha('dataInvalida','Informe data-base válida, não futura.',{campo:'saldoInicialDataBase'})
  }
 }
 return sucesso({...input,nome:input.nome.trim()} as DadosCadastro)
}
export function reciboId(c: Colecao,id: string,version: number) { return `${c}__${id}__${version}` }
export function descritorValido(value: unknown): value is DescritorCadastro {
 if(!registro(value)||!camposPermitidos(value,['operationKey','colecao','cadastroId','expectedVersion','tipo','reciboId'])) return false
 return idCadastroValido(value.operationKey)&&colecaoValida(value.colecao)&&idCadastroValido(value.cadastroId)&&Number.isSafeInteger(value.expectedVersion)&&Number(value.expectedVersion)>=0&&Number(value.expectedVersion)<Number.MAX_SAFE_INTEGER&&typeof value.tipo==='string'&&['criar','editar','arquivar'].includes(value.tipo)&&(value.tipo==='criar'?value.expectedVersion===0:Number(value.expectedVersion)>0)&&value.reciboId===reciboId(value.colecao,value.cadastroId,Number(value.expectedVersion)+1)
}
export function descrever(comando: ComandoCadastro): DescritorCadastro {
 return {operationKey:comando.operationKey,colecao:comando.colecao,cadastroId:comando.cadastroId,tipo:comando.tipo,expectedVersion:comando.expectedVersion,reciboId:reciboId(comando.colecao,comando.cadastroId,comando.expectedVersion+1)}
}
export function validarComandoCadastro(input: unknown,hoje: string): Resultado<ComandoCadastro> {
 if(!registro(input)||!camposPermitidos(input,['contractVersion','operationKey','colecao','cadastroId','expectedVersion','tipo','dados'])||input.contractVersion!==1||!colecaoValida(input.colecao)) return falha('valorInvalido','Comando cadastral inválido.')
 const descriptor={operationKey:input.operationKey,colecao:input.colecao,cadastroId:input.cadastroId,expectedVersion:input.expectedVersion,tipo:input.tipo,reciboId:reciboId(input.colecao,String(input.cadastroId),Number(input.expectedVersion)+1)}
 if(!descritorValido(descriptor)) return falha('valorInvalido','Identidade ou versão da operação inválida.')
 const d=validarDadosCadastro(input.colecao,input.dados,hoje); if(!d.ok) return d
 if(d.valor.estado!==(input.tipo==='arquivar'?'arquivado':'ativo')) return falha('valorInvalido','Estado incompatível com a operação.')
 return sucesso({...input,dados:d.valor} as ComandoCadastro)
}
export function planejarCadastro(c: Colecao,antes: DadosCadastro|undefined,depois: DadosCadastro,tipo: TipoOperacaoCadastro,bloqueado: boolean): Resultado<DadosCadastro> {
 if(tipo==='criar') return antes?falha('conflitoVersao','Cadastro já existe.',{recuperacao:'reler'}):sucesso(depois)
 if(!antes) return falha('naoEncontrado','Cadastro não encontrado.')
 if(tipo==='arquivar') return sucesso({...antes,estado:'arquivado'})
 if(antes.estado==='arquivado') return falha('valorInvalido','Cadastro arquivado não pode ser editado.')
 const sensiveis=c==='categorias'?['natureza']:c==='contas'?['tipo',...camposBaseConta]:[]
 if(bloqueado&&sensiveis.some(k=>antes[k as keyof DadosCadastro]!==depois[k as keyof DadosCadastro])) return falha('valorInvalido','Campo bloqueado após primeiro uso. Crie outro cadastro.',{recuperacao:'corrigir'})
 return sucesso(depois)
}
