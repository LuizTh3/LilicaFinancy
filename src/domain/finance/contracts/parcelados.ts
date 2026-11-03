import type { Competencia, DataCalendario } from '../calendar'
import type { Centavos, ValorPositivo } from '../money'
import type { Resultado } from '../errors'
import type { SnapshotExterno } from './externos'

export type ReferenciasParceladas = Readonly<{ categoriaId: string; titularId?: string; contaPrevistaId?: string; etiquetaIds?: readonly string[] }>
export type ParcelaExterna = ReferenciasParceladas & Readonly<{
  numero: number; quantidadeOriginal: number; descricao: string; valorCentavos: ValorPositivo
  competenciaPlanejamento: Competencia; vencimento: DataCalendario; observacao?: string
  estadoObrigacao: 'ativa' | 'cancelada'; liquidadoLiquidoCentavos: Centavos; jaLiquidada: boolean
  ultimoEventoParcelaId: string; canceledAt?: number; cancelamentoMotivo?: string
}>
export type DadosSerieParcelada = Readonly<{
  tipo: 'compromissoExterno' | 'emprestimo'; origemDados: 'nova' | 'migrada'; quantidadeOriginal: number; numeroInicial: number
  descricao: string; modo: 'mensal' | 'explicito'; diaAncora?: number; valorOriginalCentavos?: ValorPositivo
  dataContratacao?: DataCalendario; dataConsumo?: DataCalendario
  parcelas: Readonly<Record<string, ParcelaExterna>>; competencias: readonly Competencia[]
}>
export type SerieParcelada = DadosSerieParcelada & Readonly<{
  uid: string; id: string; schemaVersion: 1; version: number; ultimoEventoId: string; createdAt: number; updatedAt: number
  receitaVinculadaId?: string; substituiSerieId?: string; substituicaoEventoId?: string
}>
export type CalculoParcelado = Readonly<{ tipo: 'total'; totalCentavos: ValorPositivo; q: number; resto: number }>
  | Readonly<{ tipo: 'porParcela'; totalCentavos: ValorPositivo; valorCentavos: ValorPositivo }>
  | Readonly<{ tipo: 'explicito'; totalCentavos: ValorPositivo }>
export type PreviaCriacaoParcelada = Readonly<{ dados: DadosSerieParcelada; referencias: ReferenciasParceladas; calculo: CalculoParcelado; totalCadastradoCentavos: Centavos }>
export type TipoComandoParcelado = 'criarSerie' | 'editarParcelas' | 'cancelarParcelas' | 'substituirSerie' | 'pagarParcela' | 'reverterPagamento' | 'vincularReceita'
export type DescritorParcelado = Readonly<{ contractVersion: 1; tipo: TipoComandoParcelado; operationKey: string; serieId: string; expectedVersion: number }>
export type ConfirmacaoParcelada = Readonly<{ estado: 'confirmado'; operacaoId: string; seriesIds: readonly string[]; resultVersions: Readonly<Record<string, number>> }>
export type CriacaoParcelada = Pick<PreviaCriacaoParcelada, 'dados' | 'referencias' | 'calculo'>
export type ComandoCriacaoParcelada = Readonly<{ serieId: string; criacao: CriacaoParcelada }>
export type EventoCriacaoParcelada = Readonly<{
  uid: string; id: string; schemaVersion: 1; contractVersion: 1; tipo: 'criarSerie'; operationKey: string
  seriesIds: readonly string[]; expectedVersions: Readonly<Record<string, number>>; resultVersions: Readonly<Record<string, number>>
  comando: ComandoCriacaoParcelada; createdAt: number
}>
export interface PortaParcelados {
  criarSerie(input: Readonly<{ descritor: DescritorParcelado; entrada: unknown; conferencia: string }>): Promise<Resultado<ConfirmacaoParcelada>>
  consultarOperacao(descritor: DescritorParcelado): Promise<Resultado<ConfirmacaoParcelada | Readonly<{ estado: 'ausenteConfirmado' | 'indeterminado' }>>>
}
export type ConsultaParcelada = Readonly<{ competencia: string; tipo?: 'emprestimo' | 'compromissoExterno'; situacao?: 'todas' | 'ativas' | 'pendentes' | 'liquidadas' | 'canceladas'; titularId?: string }>
export type CursorParcelado = string & { readonly __cursorParcelado: unique symbol }
export type LinhaParcelaExterna = ParcelaExterna & Readonly<{ id: string; uid: string; serieId: string; tipo: SerieParcelada['tipo']; version: number }>
export type PaginaParcelada = Readonly<{ linhas: readonly LinhaParcelaExterna[]; snapshot: SnapshotExterno; fim: boolean; cursor?: CursorParcelado }>
