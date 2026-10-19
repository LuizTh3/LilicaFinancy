import type { Resultado } from '../errors'
import type { CalendarioFaturaV2 } from '../invoiceCalendar'
export type Fatura = CalendarioFaturaV2 & Readonly<{id:string;uid:string;cartaoId:string;schemaVersion:1;versaoConteudo:1;version:number;ultimoEventoId:string;createdAt:number;updatedAt:number}>
type Base = Readonly<{contractVersion:1;operationKey:string;alvoId:string;expectedVersion:number}>
export type ComandoFatura = Base & ({tipo:'confirmarFatura';payload:CalendarioFaturaV2 & {cartaoId:string;cartaoVersion:number}}|{tipo:'ajustarVencimento';payload:{vencimento:string;motivo:string}})
export type DescritorFatura = Base & {tipo:ComandoFatura['tipo']}
export type ResultadoFatura = Readonly<{estado:'confirmado';alvoId:string;resultVersion:number;eventoId:string}>|Readonly<{estado:'existente'|'semAlteracao';alvoId:string;resultVersion:number}>
export type ReciboFatura = Readonly<{schemaVersion:1;contractVersion:1;operationKey:string;tipo:ComandoFatura['tipo'];alvoId:string;expectedVersion:number;resultVersion:number;comando:ComandoFatura;resultado:CalendarioFaturaV2 & {cartaoId:string};antes?:{vencimento:string};createdAt:number}>
export type ConsultaFatura = {modo:'comandoCompleto';comando:ComandoFatura}|{modo:'descritor';descritor:DescritorFatura}
export type EstadoOperacaoFatura = Readonly<{estado:'confirmado';alvoId:string;resultVersion:number;eventoId:string;verificacao:ConsultaFatura['modo'];resultado:ReciboFatura['resultado']}>|{estado:'ausenteConfirmado'|'indeterminado'}
export type CursorFatura = Readonly<{uid:string;generation:number;cartaoId:string;inicio:string;fim:string;competencia:string;id:string}>
export type ConsultaFaturas = Readonly<{cartaoId:string;inicio:string;fim:string;pagina?:number;cursor?:CursorFatura}>
export type PaginaFaturas = Readonly<{itens:readonly Fatura[];fim:boolean;cursor?:CursorFatura}>
export type PreviaFatura = Readonly<{uid:string;generation:number;cartaoId:string;cartaoVersion:number;dataCompra:string;estado:'sugestao'|'escolhaExplicita'|'ausencia'|'conflito';calendario?:CalendarioFaturaV2;candidatos:readonly CalendarioFaturaV2[]}>
export interface PortaFaturas {
 executar(comando:ComandoFatura):Promise<Resultado<ResultadoFatura>>
 consultarOperacao(consulta:ConsultaFatura):Promise<Resultado<EstadoOperacaoFatura>>
 obter(cartaoId:string,competencia:string):Promise<Resultado<Fatura>>
 listar(consulta:ConsultaFaturas):Promise<Resultado<PaginaFaturas>>
}
export interface PortaPreviaFatura { prever(cartaoId:string,dataCompra:string,escolhaExplicita?:string):Promise<Resultado<PreviaFatura>> }
