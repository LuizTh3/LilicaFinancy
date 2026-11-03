import { avancarCompetencia, competencia, dataCalendario } from '../calendar'
import { camposPermitidos, falha, registro, sucesso, umDe, versaoValida } from '../errors'
import type { Resultado, CodigoErro } from '../errors'
import { centavos } from '../money'
import type { Diferenca } from '../money'
import { idCadastroValido } from '../cadastros'

export const basesPainel = ['planejamento', 'caixa', 'consumo'] as const
export type BasePainel = typeof basesPainel[number]
export const dimensoesPainel = ['titulares', 'cartoes', 'categorias', 'etiquetas'] as const
export type FiltrosPainel = Readonly<Partial<Record<typeof dimensoesPainel[number], readonly string[]>>>
export type ConsultaPainel = Readonly<{ contractVersion: 1; base: BasePainel; inicio: string; fim: string; modo: 'mensal' | '12meses'; filtros: FiltrosPainel }>
export type SnapshotPainel = Readonly<{ uid: string; generation: number; readTime: string; expiresAt: number; contractRevision: 1; hojeFinanceiro: string }>
export const autoridadesPainel = ['externo', 'fatura', 'compra', 'parcelaCartao', 'efeito008', 'parcelaExterna', 'serieExterna', 'ocorrenciaExterna', 'assinatura', 'fato', 'transferencia'] as const
export type AutoridadePainel = typeof autoridadesPainel[number]
export type ContribuicaoPainel = Readonly<{
 chave: string; autoridade: AutoridadePainel; origemId: string; alvoId?: string; competencia: string; dataFinanceira: string
 base: BasePainel; natureza: 'entrada' | 'saida'; valorCentavos: number; estimado: boolean; fonte: 'virtual' | 'persistida'
 categoriaId?: string; titularId?: string; cartaoId?: string; etiquetaIds?: readonly string[]; revisao: number
 liquidadoCentavos?: number; estadoObrigacao?: 'ativa' | 'cancelada'
}>
export const motivosPainel = ['fonteNaoHabilitada', 'paginasIncompletas', 'filtroIncompativel', 'prerequisitosSaldoAusentes', 'snapshotExpirado', 'integridadeIndeterminada', 'limiteOperacional', 'dadosNaoAtribuiveis'] as const
export type MotivoPainel = typeof motivosPainel[number]
export type IndicadorPainel =
 | Readonly<{ estado: 'completo'; valorCentavos: number; resultado?: never; estimadoCentavos: number; contribuicoes: readonly string[]; readTime: string }>
 | Readonly<{ estado: 'completo'; resultado: Diferenca; valorCentavos?: never; estimadoCentavos: number; contribuicoes: readonly string[]; readTime: string }>
 | Readonly<{ estado: 'parcial'; subtotalCentavos: number; motivos: readonly MotivoPainel[]; readTime: string }>
 | Readonly<{ estado: 'indisponivel'; motivo: MotivoPainel }>
 | Readonly<{ estado: 'erro'; codigo: CodigoErro }>
export type CapacidadeFontePainel = Readonly<{ fonte: FontePainel; contractRevision: number; bases: readonly BasePainel[]; estado: 'naoHabilitada' | 'comprovada'; evidencia?: string }>
export const fontesPainel = ['externos', 'calendarios', 'compras', 'liquidacoes', 'parcelados', 'recorrencias'] as const
export type FontePainel = typeof fontesPainel[number]
export type CoberturaPainel = Readonly<{ fonte: FontePainel; fase: string; competencia: string; estado: 'naoIniciada' | 'emAndamento' | 'completa' | 'indisponivel' | 'erro' }>
export type ResumoMensalPainel = Readonly<{ competencia: string; base: BasePainel; indicadores: Readonly<Record<string, IndicadorPainel>> }>
export type JanelaPainel = Readonly<{ consulta: ConsultaPainel; snapshot: SnapshotPainel; meses: readonly ResumoMensalPainel[]; cobertura: readonly CoberturaPainel[]; completo: boolean }>
export type CursorPainel = string & { readonly __cursorPainel: unique symbol }
export type PaginaPainel = Readonly<{ consulta: ConsultaPainel; snapshot: SnapshotPainel; contribuicoes: readonly ContribuicaoPainel[]; cobertura: readonly CoberturaPainel[]; completo: boolean; cursor?: CursorPainel }>
export interface OrcamentoLeituraPainel {
 executar<T>(limiteDocumentos: number, operacao: () => Promise<{ documentos: number; valor: T }>): Promise<T>
 readonly documentos: number
 readonly requisicoes: number
 readonly disponiveis: number
}
export interface PortaPainel {
 iniciar(consulta: ConsultaPainel): Promise<Resultado<PaginaPainel>>
 continuar(cursor: CursorPainel): Promise<Resultado<PaginaPainel>>
 atualizar(consulta: ConsultaPainel): Promise<Resultado<PaginaPainel>>
 detalhar(cursor: CursorPainel): Promise<Resultado<PaginaPainel>>
 invalidarSessao(): void
}
const invalid = () => falha('valorInvalido', 'Informe uma consulta ou indicador financeiro válido.')
export function instanteSnapshotValido(value: unknown): value is string {
 if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?Z$/.test(value) || !dataCalendario(value.slice(0, 10)).ok) return false
 const fraction = value.match(/\.(\d+)Z$/)?.[1] ?? ''
 return Number.isFinite(Date.parse(value)) && !/[1-9]/.test(fraction.slice(6))
}
export function normalizarConsultaPainel(input: unknown): Resultado<ConsultaPainel> {
 if (!registro(input) || !camposPermitidos(input, ['contractVersion', 'base', 'inicio', 'fim', 'modo', 'filtros']) || input.contractVersion !== 1 || !umDe(input.base, basesPainel) || !umDe(input.modo, ['mensal', '12meses']) || !competencia(input.inicio).ok || !competencia(input.fim).ok || !registro(input.filtros) || !camposPermitidos(input.filtros, [...dimensoesPainel])) return invalid()
 const last = avancarCompetencia(input.inicio, input.modo === 'mensal' ? 0 : 11)
 if (!last.ok || last.valor !== input.fim) return invalid()
 const filtros: Partial<Record<typeof dimensoesPainel[number], readonly string[]>> = {}
 for (const key of dimensoesPainel) {
  const values = input.filtros[key]
  if (values === undefined) continue
  if (!Array.isArray(values) || values.length > 50 || !values.every(idCadastroValido)) return invalid()
  if (values.length) filtros[key] = Object.freeze([...new Set(values as string[])].sort())
 }
 return sucesso(Object.freeze({ contractVersion: 1, base: input.base, inicio: input.inicio as string, fim: input.fim as string, modo: input.modo, filtros: Object.freeze(filtros) }))
}
export function validarSnapshotPainel(input: unknown, ctx: { uid: string; generation: number; agora: number }): Resultado<SnapshotPainel> {
 if (!registro(input) || !camposPermitidos(input, ['uid', 'generation', 'readTime', 'expiresAt', 'contractRevision', 'hojeFinanceiro']) || !ctx.uid || !/^[A-Za-z0-9_-]{1,128}$/.test(ctx.uid) || !versaoValida(ctx.generation) || !Number.isSafeInteger(ctx.agora) || input.uid !== ctx.uid || input.generation !== ctx.generation || !instanteSnapshotValido(input.readTime) || input.contractRevision !== 1 || !dataCalendario(input.hojeFinanceiro).ok) return invalid()
 const ms = Date.parse(input.readTime)
 if (input.expiresAt !== ms + 50 * 60000 || ctx.agora >= (input.expiresAt as number) || ms > ctx.agora + 60000) return falha('integridadeIndeterminada', 'A consulta expirou ou pertence a outro instante.', { recuperacao: 'reler' })
 return sucesso(Object.freeze({ ...input }) as SnapshotPainel)
}
export function validarIndicadorPainel(input: unknown): Resultado<IndicadorPainel> {
 if (!registro(input)) return invalid()
 if (input.estado === 'indisponivel') return camposPermitidos(input, ['estado', 'motivo']) && umDe(input.motivo, motivosPainel) ? sucesso(input as IndicadorPainel) : invalid()
 if (input.estado === 'erro') return camposPermitidos(input, ['estado', 'codigo']) && umDe(input.codigo, ['valorInvalido', 'limiteMonetario', 'dataInvalida', 'referenciaInvalida', 'naoEncontrado', 'conflitoVersao', 'conflitoIdempotencia', 'limiteOperacional', 'semPermissao', 'indisponivel', 'cotaExcedida', 'esquemaIncompativel', 'confirmacaoIndeterminada', 'configuracaoPendente', 'excessoPendente', 'integridadeIndeterminada']) ? sucesso(input as IndicadorPainel) : invalid()
 if (!instanteSnapshotValido(input.readTime)) return invalid()
 if (input.estado === 'parcial') return camposPermitidos(input, ['estado', 'subtotalCentavos', 'motivos', 'readTime']) && centavos(input.subtotalCentavos).ok && Array.isArray(input.motivos) && input.motivos.length > 0 && input.motivos.every(m => umDe(m, motivosPainel)) ? sucesso(input as IndicadorPainel) : invalid()
 if (input.estado !== 'completo' || !camposPermitidos(input, ['estado', 'valorCentavos', 'resultado', 'estimadoCentavos', 'contribuicoes', 'readTime']) || !centavos(input.estimadoCentavos).ok || !Array.isArray(input.contribuicoes) || input.contribuicoes.some(c => typeof c !== 'string' || !c.length || c.length > 240) || new Set(input.contribuicoes).size !== input.contribuicoes.length) return invalid()
 if ('valorCentavos' in input) return !('resultado' in input) && centavos(input.valorCentavos).ok && (input.estimadoCentavos as number) <= (input.valorCentavos as number) ? sucesso(input as IndicadorPainel) : invalid()
 const r = input.resultado
 return registro(r) && camposPermitidos(r, ['natureza', 'magnitudeCentavos']) && umDe(r.natureza, ['superavit', 'deficit', 'equilibrio']) && centavos(r.magnitudeCentavos).ok && (r.natureza === 'equilibrio' ? r.magnitudeCentavos === 0 : (r.magnitudeCentavos as number) > 0) ? sucesso(input as IndicadorPainel) : invalid()
}
export function chaveContribuicao(autoridade: AutoridadePainel, id: string, ordinal?: number): string {
 if (!umDe(autoridade, autoridadesPainel) || !/^[A-Za-z0-9_-]{1,160}$/.test(id) || (ordinal !== undefined && (!Number.isSafeInteger(ordinal) || ordinal < 1 || ordinal > 32))) throw new Error('REFERENCIA_PAINEL_INVALIDA')
 return `${autoridade}:${id}${ordinal === undefined ? '' : ':' + ordinal}`
}

export function contribuicaoPainelValida(value: unknown, q: ConsultaPainel): value is ContribuicaoPainel {
 if (!registro(value) || !camposPermitidos(value, ['chave', 'autoridade', 'origemId', 'alvoId', 'competencia', 'dataFinanceira', 'base', 'natureza', 'valorCentavos', 'estimado', 'fonte', 'categoriaId', 'titularId', 'cartaoId', 'etiquetaIds', 'revisao', 'liquidadoCentavos', 'estadoObrigacao']) || typeof value.chave !== 'string' || !/^[A-Za-z0-9:_-]{1,240}$/.test(value.chave) || !autoridadesPainel.includes(value.autoridade as never) || !value.chave.startsWith(String(value.autoridade) + ':') || !competencia(value.competencia).ok || (value.competencia as string) < q.inicio || (value.competencia as string) > q.fim || !dataCalendario(value.dataFinanceira).ok || value.base !== q.base || !['entrada', 'saida'].includes(String(value.natureza)) || !centavos(value.valorCentavos).ok || typeof value.estimado !== 'boolean' || !['virtual', 'persistida'].includes(String(value.fonte)) || !Number.isSafeInteger(value.revisao) || (value.revisao as number) < 1) return false
 if (typeof value.origemId !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(value.origemId)) return false
 for (const key of ['alvoId', 'categoriaId', 'titularId', 'cartaoId']) if (key in value && (typeof value[key] !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(value[key] as string))) return false
 if ('liquidadoCentavos' in value && (!centavos(value.liquidadoCentavos).ok || (value.liquidadoCentavos as number) > (value.valorCentavos as number))) return false
 if ('estadoObrigacao' in value && !['ativa', 'cancelada'].includes(String(value.estadoObrigacao))) return false
 return value.etiquetaIds === undefined || Array.isArray(value.etiquetaIds) && value.etiquetaIds.length <= 5 && new Set(value.etiquetaIds).size === value.etiquetaIds.length && value.etiquetaIds.every(e => typeof e === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(e))
}

export function fontesNecessariasPainel(base: BasePainel): readonly FontePainel[] { return Object.freeze(fontesPainel.filter(f => base === 'planejamento' || f !== 'calendarios' && (base !== 'caixa' || f !== 'compras'))) }
