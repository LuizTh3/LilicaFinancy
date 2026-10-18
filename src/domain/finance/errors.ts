export type CodigoErro = 'valorInvalido' | 'limiteMonetario' | 'dataInvalida' | 'referenciaInvalida' | 'naoEncontrado' | 'conflitoVersao' | 'conflitoIdempotencia' | 'limiteOperacional' | 'semPermissao' | 'indisponivel' | 'cotaExcedida' | 'esquemaIncompativel' | 'confirmacaoIndeterminada' | 'configuracaoPendente' | 'excessoPendente' | 'integridadeIndeterminada'
export type ContextoErro = Readonly<{ campo?: string; limite?: number; versaoAtual?: number; recuperacao?: 'corrigir' | 'reler' | 'repetirMesmaChave' | 'verificarAcesso' }>
export type ErroDominio = ContextoErro & Readonly<{ codigo: CodigoErro; mensagem: string }>
export type Resultado<T> = Readonly<{ ok: true; valor: T }> | Readonly<{ ok: false; erro: ErroDominio }>
export const sucesso = <T>(valor: T): Resultado<T> => ({ ok: true, valor })
export const falha = (codigo: CodigoErro, mensagem: string, contexto: ContextoErro = {}): Resultado<never> => ({ ok: false, erro: { codigo, mensagem, ...(contexto.campo !== undefined ? { campo: contexto.campo } : {}), ...(contexto.limite !== undefined ? { limite: contexto.limite } : {}), ...(contexto.versaoAtual !== undefined ? { versaoAtual: contexto.versaoAtual } : {}), ...(contexto.recuperacao !== undefined ? { recuperacao: contexto.recuperacao } : {}) } })
export const registro = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype
export const camposPermitidos = (value: Record<string, unknown>, campos: readonly string[]) => Object.keys(value).every(key => campos.includes(key))
export const texto = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && [...value].length <= max
export const versaoValida = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0
export const umDe = <T extends string>(value: unknown, choices: readonly T[]): value is T => typeof value === 'string' && choices.includes(value as T)
