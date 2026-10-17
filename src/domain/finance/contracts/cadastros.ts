import type { Resultado } from '../errors'
export const colecoes = ['titulares','categorias','contas','etiquetas'] as const
export type Colecao = typeof colecoes[number]
export type EstadoCadastro = 'ativo' | 'arquivado'
export type DadosCadastro = Readonly<{ nome: string; estado: EstadoCadastro; natureza?: 'receita'|'despesa'; tipo?: 'banco'|'carteira'|'contaPagamento'; titularId?: string; saldoInicialCentavos?: number; saldoInicialPosicao?: 'credora'|'devedora'; saldoInicialDataBase?: string }>
type Basico = Pick<DadosCadastro,'nome'|'estado'>
export type EntradaCadastro =
 | { colecao: 'titulares'|'etiquetas'; dados: Basico }
 | { colecao: 'categorias'; dados: Basico & Required<Pick<DadosCadastro,'natureza'>> }
 | { colecao: 'contas'; dados: Basico & Required<Pick<DadosCadastro,'tipo'>> & Pick<DadosCadastro,'titularId'|'saldoInicialCentavos'|'saldoInicialPosicao'|'saldoInicialDataBase'> }
export type TipoOperacaoCadastro = 'criar'|'editar'|'arquivar'
export type ComandoCadastro = EntradaCadastro & Readonly<{ contractVersion: 1; operationKey: string; cadastroId: string; expectedVersion: number; tipo: TipoOperacaoCadastro }>
export type DescritorCadastro = Readonly<{ operationKey: string; colecao: Colecao; cadastroId: string; expectedVersion: number; tipo: TipoOperacaoCadastro; reciboId: string }>
export type ConsultaOperacaoCadastro = { modo: 'comandoCompleto'; comando: ComandoCadastro } | { modo: 'descritor'; descritor: DescritorCadastro }
export type Cadastro = Readonly<{ id: string; uid: string; colecao: Colecao; dados: DadosCadastro; schemaVersion: 1; version: number; createdAt: number; updatedAt: number; archivedAt?: number }>
export type ReciboCadastro = Readonly<{ schemaVersion: 1; operationKey: string; colecao: Colecao; cadastroId: string; expectedVersion: number; version: number; tipo: TipoOperacaoCadastro; dados: DadosCadastro; createdAt: number }>
export type ConfirmacaoCadastro = Readonly<{ estado: 'confirmado'; cadastroId: string; version: number; reciboId: string }>
export type ResultadoMutacao = ConfirmacaoCadastro | Readonly<{ estado: 'semAlteracao'; cadastroId: string; version: number }>
export type ConsultaConfirmada = ConfirmacaoCadastro & { verificacao: ConsultaOperacaoCadastro['modo']; dados: DadosCadastro }
export type EstadoConsulta = ConsultaConfirmada | { estado: 'ausenteConfirmado'|'indeterminado' }
export type FiltroCadastro = EstadoCadastro|'todos'
export type CursorCadastro = Readonly<{ uid: string; colecao: Colecao; filtro: FiltroCadastro; nome: string; id: string }>
export type PaginaCadastros = Readonly<{ itens: readonly Cadastro[]; cursor?: CursorCadastro; fim: boolean }>
export interface PortaCadastros {
 executar(comando: ComandoCadastro): Promise<Resultado<ResultadoMutacao>>
 consultarOperacao(consulta: ConsultaOperacaoCadastro): Promise<Resultado<EstadoConsulta>>
 obter(colecao: Colecao, id: string): Promise<Resultado<Cadastro>>
 listar(colecao: Colecao, filtro: FiltroCadastro, pageSize?: number, cursor?: CursorCadastro): Promise<Resultado<PaginaCadastros>>
 bloqueado(colecao: Colecao, id: string): Promise<Resultado<boolean>>
}
