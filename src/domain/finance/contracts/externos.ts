import type { Resultado } from '../errors'

export const tiposExternos = ['criarReceita','criarDespesa','gastoImediato','editarOrigem','cancelarOrigem','receber','pagar','reverterRecebimento','reverterPagamento'] as const
export type TipoExterno = typeof tiposExternos[number]
export type NaturezaExterna = 'receita' | 'despesa'
export type DadosExternosComuns = Readonly<{
 descricao: string; categoriaId: string; valorCentavos: number; estimado: boolean; competenciaPlanejamento: string
 titularId?: string; contaPrevistaId?: string; etiquetaIds?: readonly string[]; observacao?: string
}>
export type DadosExterno = DadosExternosComuns & (
 | Readonly<{ natureza: 'receita'; dataPrevista: string; vencimento?: never; dataConsumo?: never }>
 | Readonly<{ natureza: 'despesa'; vencimento: string; dataConsumo: string; dataPrevista?: never }>
)
type IntencaoExterna = Readonly<{ contractVersion: 1; operationKey: string; origemId: string; expectedVersion: number }>
export type ComandoExterno = IntencaoExterna & (
 | Readonly<{ tipo: 'criarReceita'; dados: DadosExterno & { natureza: 'receita' }; substituiOrigemId?: string }>
 | Readonly<{ tipo: 'criarDespesa'; dados: DadosExterno & { natureza: 'despesa' }; substituiOrigemId?: string }>
 | Readonly<{ tipo: 'gastoImediato'; dados: DadosExterno & { natureza: 'despesa' }; dataEfetiva: string; contaId: string; substituiOrigemId?: string }>
 | Readonly<{ tipo: 'editarOrigem'; dados: DadosExterno }>
 | Readonly<{ tipo: 'cancelarOrigem'; motivo: string }>
 | Readonly<{ tipo: 'receber' | 'pagar'; valorCentavos: number; dataEfetiva: string; contaId: string }>
 | Readonly<{ tipo: 'reverterRecebimento' | 'reverterPagamento'; originalId: string; motivo: string }>
)
export type OrigemExterna = DadosExterno & Readonly<{
 id: string; uid: string; schemaVersion: 1; version: number; createdAt: number; updatedAt: number
 estadoObrigacao: 'ativa' | 'cancelada'; liquidadoLiquidoCentavos: number; jaLiquidada: boolean; ultimoEventoId: string
 substituiOrigemId?: string; canceledAt?: number; cancelamentoMotivo?: string
}>
export type FatoExterno = Readonly<{ valorCentavos: number; dataEfetiva: string; contaId: string }> & (
 | Readonly<{ tipo: 'pagamento' | 'recebimento'; originalId?: never; motivo?: never }>
 | Readonly<{ tipo: 'reversaoPagamento' | 'reversaoRecebimento'; originalId: string; motivo: string }>
)
export type EventoExterno = Readonly<{
 id: string; uid: string; schemaVersion: 1; contractVersion: 1; tipo: TipoExterno; operationKey: string
 origemId: string; natureza: NaturezaExterna; expectedVersion: number; resultVersion: number
 comando: ComandoExterno; antes?: DadosExterno; depois: DadosExterno; fato?: FatoExterno; createdAt: number
}>
export type MarcadorReversaoExterna = Readonly<{ id: string; uid: string; schemaVersion: 1; origemId: string; originalId: string; reversaoEventoId: string; createdAt: number }>
export type DescritorExterno = Pick<ComandoExterno,'contractVersion'|'operationKey'|'origemId'|'expectedVersion'|'tipo'> & Readonly<{ uid: string }>
export type ConsultaOperacaoExterna = Readonly<{ modo: 'comandoCompleto'; comando: ComandoExterno }> | Readonly<{ modo: 'descritor'; descritor: DescritorExterno }>
export type ConfirmacaoExterna = Readonly<{ estado: 'confirmado'; origemId: string; eventoId: string; resultVersion: number; fatoId?: string }>
export type SemAlteracaoExterna = Readonly<{ estado: 'semAlteracao'; origemId: string; version: number }>
export type EstadoOperacaoExterna = (ConfirmacaoExterna & Readonly<{ verificacao: ConsultaOperacaoExterna['modo']; evento: EventoExterno }>) | Readonly<{ estado: 'ausenteConfirmado' | 'indeterminado' }>

export type SnapshotExterno = Readonly<{ uid: string; generation: number; readTime: string; expiresAt: number }>
export type FiltroExterno = Readonly<{ natureza: 'receita' | 'despesa' | 'ambas'; situacao?: 'pendente' | 'parcial' | 'liquidada' | 'cancelada'; categoriaId?: string; titularId?: string }>
export type ConsultaExterna = Readonly<{ base: 'planejamento' | 'caixa'; competencia: string; filtro: FiltroExterno; pageSize: number }>
export type CursorExterno = Readonly<{ snapshot: SnapshotExterno; consulta: ConsultaExterna; posicoes: Readonly<Record<string, readonly string[]>> }>
export type LinhaExterna = Readonly<{ origem: OrigemExterna; evento?: EventoExterno; exigivelCentavos: number; liquidadoCentavos: number; pendenteCentavos: number; situacao: 'pendente' | 'parcial' | 'liquidada' | 'cancelada' }>
export type PaginaExterna = Readonly<{ itens: readonly LinhaExterna[]; snapshot: SnapshotExterno; completo: boolean; motivos: readonly string[]; cursor?: CursorExterno }>
export type DetalheExterno = Readonly<{ origem: OrigemExterna; referencias: Readonly<Record<string,string>>; eventos: readonly EventoExterno[]; snapshot: SnapshotExterno; completo: boolean; proximaVersao?: number }>
export interface PortaExternos {
 executar(comando: ComandoExterno): Promise<Resultado<ConfirmacaoExterna | SemAlteracaoExterna>>
 consultarOperacao(consulta: ConsultaOperacaoExterna): Promise<Resultado<EstadoOperacaoExterna>>
 listar(consulta: ConsultaExterna, cursor?: CursorExterno): Promise<Resultado<PaginaExterna>>
 detalhe(origemId: string, pageSize?: number, snapshot?: SnapshotExterno, proximaVersao?: number): Promise<Resultado<DetalheExterno>>
}
