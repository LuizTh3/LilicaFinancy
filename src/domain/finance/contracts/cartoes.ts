import type { Resultado } from '../errors'
export type EstadoCartao = 'ativo' | 'arquivado'
export type DadosCartao = Readonly<{banco:string;nome:string;titularId:string;diaFechamento:number;diaVencimento:number}>
export type Cartao = DadosCartao & Readonly<{id:string;uid:string;estado:EstadoCartao;schemaVersion:1;version:number;ultimoEventoId:string;createdAt:number;updatedAt:number;archivedAt?:number}>
export type TipoComandoCartao = 'criarCartao'|'editarCartao'|'arquivarCartao'
type Base = Readonly<{contractVersion:1;operationKey:string;alvoId:string;expectedVersion:number}>
export type ComandoCartao = Base & ({tipo:'criarCartao'|'editarCartao';payload:DadosCartao}|{tipo:'arquivarCartao';payload:Readonly<Record<string,never>>})
export type DescritorCartao = Base & Readonly<{tipo:TipoComandoCartao}>
export type ResultadoCartao = Readonly<{estado:'confirmado';alvoId:string;resultVersion:number;eventoId:string}> | Readonly<{estado:'semAlteracao';alvoId:string;resultVersion:number}>
export type ReciboCartao = Readonly<{schemaVersion:1;contractVersion:1;operationKey:string;tipo:TipoComandoCartao;alvoId:string;expectedVersion:number;resultVersion:number;comando:ComandoCartao;resultado:DadosCartao & {estado:EstadoCartao};antes?:DadosCartao & {estado:EstadoCartao};createdAt:number}>
export type ConsultaCartao = {modo:'comandoCompleto';comando:ComandoCartao}|{modo:'descritor';descritor:DescritorCartao}
export type ConfirmacaoCartao = Readonly<{estado:'confirmado';alvoId:string;resultVersion:number;eventoId:string;verificacao:ConsultaCartao['modo'];resultado:ReciboCartao['resultado']}>
export type EstadoOperacaoCartao = ConfirmacaoCartao|Readonly<{estado:'ausenteConfirmado'|'indeterminado'}>
export type CursorCartao = Readonly<{uid:string;generation:number;filtro:EstadoCartao|'todos';nome:string;id:string}>
export type PaginaCartoes = Readonly<{itens:readonly Cartao[];fim:boolean;cursor?:CursorCartao}>
export interface PortaCartoes {
 executar(comando:ComandoCartao):Promise<Resultado<ResultadoCartao>>
 consultarOperacao(consulta:ConsultaCartao):Promise<Resultado<EstadoOperacaoCartao>>
 obter(cartaoId:string):Promise<Resultado<Cartao>>
 listar(filtro:EstadoCartao|'todos',pagina?:number,cursor?:CursorCartao):Promise<Resultado<PaginaCartoes>>
}
