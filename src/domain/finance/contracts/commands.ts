// Read models and use-case contracts only; no persistence implementation or SDK types.
import type { Resultado } from '../errors'
import type { CompromissoProposto } from '../installments'
import type { CalendarioFatura } from '../invoiceCalendar'
import type { Ocorrencia } from '../recurrence'
export type TipoAlvo = 'receita' | 'obrigacaoExternaAvulsa' | 'parcelaExterna' | 'fatura' | 'parcelaCartao'
export type ReferenciaAlvo = Readonly<{ tipo: TipoAlvo; id: string }>
export type EstadoObrigacao = 'ativa' | 'cancelada'
type FatoBase = Readonly<{ id: string; uid: string; schemaVersion: number; version: number; alvo: ReferenciaAlvo; valorCentavos: number; dataEfetiva: string; contaId: string; operacaoId: string }>
export type FatoLiquidacao = FatoBase & (
  | Readonly<{ tipo: 'pagamento' | 'recebimento'; originalId?: never; motivo?: never; estornoId?: never }>
  | Readonly<{ tipo: 'reversaoPagamento' | 'reversaoRecebimento'; originalId: string; motivo: string; estornoId?: never }>
  | Readonly<{ tipo: 'reembolso'; originalId: string; motivo: string; estornoId: string }>
)
export type CreditoObrigacao = Readonly<{ id: string; uid: string; schemaVersion: number; version: number; tipo: 'creditoObrigacao'; alvo: ReferenciaAlvo; origemId: string; valorCentavos: number; dataEfeito: string; motivo: string; operacaoId: string; estornoId?: string }>
export type EstornoConsumo = Readonly<{ id: string; uid: string; origemId: string; origemTipo: 'compra' | 'obrigacaoExterna'; valorCentavos: number; dataEfeito: string; motivo: string; operacaoId: string }>
export type ItemFatura = Readonly<{ id: string; uid: string; origemId: string; cartaoId: string; faturaId: string; valorCentavos: number; competenciaPlanejamento: string; vencimento: string; estadoObrigacao: EstadoObrigacao }>
export type SnapshotAlvo = Readonly<{
  uid: string; schemaVersion: number; version: number; alvo: ReferenciaAlvo; completo: boolean; revisao: Readonly<{ antes: number; depois: number }>
  estadoObrigacao: EstadoObrigacao; vencimento: string; valorOriginalCentavos?: number; origemId?: string; dataConsumo?: string; estimado?: boolean
  calendario?: Readonly<{ cartaoId: string; competencia: string; fechamento: string; vencimento: string; ciclo: 'aberta' | 'fechada' }>
  itens?: readonly ItemFatura[]; fatura?: SnapshotAlvo
  contas: readonly Readonly<{ id: string; uid: string; estadoCadastro: 'ativo' | 'arquivado' }>[]
  fatos: readonly FatoLiquidacao[]; creditos: readonly CreditoObrigacao[]
}>
type OrigemBase = Readonly<{ id: string; uid: string; tipo: 'compra' | 'obrigacaoExterna'; categoriaId: string; estadoObrigacao?: EstadoObrigacao; etiquetaIds?: readonly string[] }>
export type OrigemConsumo = OrigemBase & (
  | Readonly<{ origemDados: 'nova'; valorTotalCentavos: number; dataConsumo: string; saldoMigradoCentavos?: never }>
  | Readonly<{ origemDados: 'migrada'; saldoMigradoCentavos: number; valorTotalCentavos?: number; dataConsumo?: string }>
)
export type CompromissoPlanejamento = Readonly<{ id: string; uid: string; origemId: string; tipo: 'obrigacaoExternaAvulsa' | 'parcelaExterna' | 'parcelaCartao'; faturaId?: string; valorCentavos: number; competenciaPlanejamento: string; vencimento: string; estadoObrigacao: EstadoObrigacao }>
export type ReceitaPlanejamento = Readonly<{ id: string; uid: string; valorCentavos: number; competenciaPlanejamento: string; dataPrevista: string; estadoObrigacao: EstadoObrigacao; estimado: boolean }>
export type DadosPeriodo = Readonly<{
  uid: string; completo: boolean; revisao: Readonly<{ antes: number; depois: number }>
  origens: readonly OrigemConsumo[]; compromissos: readonly CompromissoPlanejamento[]; receitas: readonly ReceitaPlanejamento[]
  fatos: readonly FatoLiquidacao[]; estornos: readonly EstornoConsumo[]; creditos: readonly CreditoObrigacao[]
}>
export type VersaoEsperada = Readonly<{ id: string; version: number }>
export type ComandoLiquidacao = Readonly<{ tipo: 'pagamento' | 'recebimento'; id: string; valorCentavos: number; dataEfetiva: string; contaId: string; operacaoId: string; expectedVersion: number }>

export type Envelope<T extends string, P> = Readonly<{ contractVersion: 1; tipo: T; operationKey: string; payload: P; expectedVersions: readonly VersaoEsperada[] }>
export type Confirmacao = Readonly<{ estado: 'confirmado'; operacaoId: string; resultados: readonly Readonly<{ tipo: string; id: string; version: number }>[] }>
export type ConsultaOperacao = Confirmacao | Readonly<{ estado: 'ausenteConfirmado' | 'indeterminado' }>
export type ComandoSerie = Envelope<'criarCompra' | 'criarObrigacaoParcelada', Readonly<{ origemId: string; origemTipo: 'compra' | 'obrigacaoExterna'; cartaoId?: string; categoriaId: string; etiquetaIds?: readonly string[]; entradaCronograma: Readonly<Record<string, unknown>>; parcelas: readonly CompromissoProposto[]; faturas: readonly Readonly<{ id: string; calendario: CalendarioFatura }>[] }>>
export type ComandoRegistrarLiquidacao = Envelope<'registrarLiquidacao', Readonly<{ alvo: ReferenciaAlvo; comando: Omit<ComandoLiquidacao, 'operacaoId' | 'expectedVersion'> }>>
type IntencaoInversao = Readonly<{ tipo: 'reversaoPagamento' | 'reversaoRecebimento'; id: string; originalId: string; valorCentavos: number; dataEfetiva: string; motivo: string }>
type IntencaoCredito = Readonly<{ tipo: 'creditoObrigacao'; id: string; origemId: string; alvo?: ReferenciaAlvo; valorCentavos: number; dataEfeito: string; motivo: string }>
export type ComandoCorrecao = Envelope<'aplicarCorrecao', IntencaoInversao | IntencaoCredito>
export interface PortaCriarSerie {
  criar(comando: ComandoSerie): Promise<Resultado<Confirmacao>>
  consultarOperacao(tipo: string, chave: string): Promise<Resultado<ConsultaOperacao>>
}
export interface PortaLiquidacao {
  registrar(comando: ComandoRegistrarLiquidacao): Promise<Resultado<Confirmacao>>
  corrigir(comando: ComandoCorrecao): Promise<Resultado<Confirmacao>>
  consultarOperacao(tipo: string, chave: string): Promise<Resultado<ConsultaOperacao>>
}
export type ConsultaPeriodo = Readonly<{ baseTemporal: 'consumo' | 'planejamento' | 'caixa'; inicio: string; fim: string; pageSize: number; cursor?: string }>
export type LinhaPeriodo = Readonly<{ id: string; uid: string; competencia: string }>
export type PaginaPeriodo = Readonly<{ itens: readonly LinhaPeriodo[]; completo: boolean; revisao: number; proximaPagina?: string; motivos: readonly string[] }>
export interface PortaConsultarPeriodo { listar(consulta: ConsultaPeriodo): Promise<Resultado<PaginaPeriodo>> }
export type ComandoMaterializar = Envelope<'materializarOcorrencias', Readonly<{ recorrenciaId: string; competencias: readonly string[]; excecoes?: readonly Readonly<{ competencia: string; valorDefinitivo: number }>[] }>>
export type ComandoConfirmarOcorrencia = Envelope<'confirmarValorOcorrencia', Readonly<{ ocorrenciaId: string; valorDefinitivo: number }>>
export interface PortaRecorrencia {
  materializar(comando: ComandoMaterializar): Promise<Resultado<Confirmacao>>
  confirmar(comando: ComandoConfirmarOcorrencia): Promise<Resultado<Confirmacao>>
  consultarOcorrencias(): Promise<Resultado<readonly Ocorrencia[]>>
}
