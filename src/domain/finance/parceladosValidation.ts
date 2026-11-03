import { idCartaoValido } from './cartoes'
import type { ReferenciasParceladas, TipoComandoParcelado } from './contracts/parcelados'
import { camposPermitidos, falha, registro, sucesso } from './errors'
import type { Resultado } from './errors'
import { instanteTecnicoValido } from './technicalTime'

export const tiposParcelados: readonly TipoComandoParcelado[] = ['criarSerie', 'editarParcelas', 'cancelarParcelas', 'substituirSerie', 'pagarParcela', 'reverterPagamento', 'vincularReceita']
export const eventoParceladoValido = (v: unknown): v is string => typeof v === 'string' && /^(criarSerie|editarParcelas|cancelarParcelas|substituirSerie|pagarParcela|reverterPagamento|vincularReceita)__[A-Za-z0-9-]{1,64}$/.test(v)
export const posicaoParcelada = (n: number) => `p${String(n).padStart(2, '0')}`
export const instanteParceladoValido = instanteTecnicoValido
export function identidadeParcelaExterna(serieId: unknown, numero: unknown): Resultado<string> {
  return idCartaoValido(serieId) && typeof numero === 'number' && Number.isInteger(numero) && numero >= 1 && numero <= 12 ? sucesso(`${serieId}__${posicaoParcelada(numero)}`) : falha('valorInvalido', 'Série ou ordinal inválidos.')
}
export function normalizarReferenciasParceladas(v: unknown): Resultado<ReferenciasParceladas> {
  if (!registro(v) || !camposPermitidos(v, ['categoriaId', 'titularId', 'contaPrevistaId', 'etiquetaIds']) || !idCartaoValido(v.categoriaId)) return falha('referenciaInvalida', 'Confira as referências das parcelas.')
  for (const campo of ['titularId', 'contaPrevistaId']) if (campo in v && !idCartaoValido(v[campo])) return falha('referenciaInvalida', 'Confira titular e conta prevista.')
  if ('etiquetaIds' in v && (!Array.isArray(v.etiquetaIds) || v.etiquetaIds.length > 5 || v.etiquetaIds.some(id => !idCartaoValido(id)) || new Set(v.etiquetaIds).size !== v.etiquetaIds.length)) return falha('referenciaInvalida', 'Informe até cinco etiquetas distintas.')
  return sucesso(Object.freeze({ categoriaId: v.categoriaId, ...(v.titularId ? { titularId: v.titularId as string } : {}), ...(v.contaPrevistaId ? { contaPrevistaId: v.contaPrevistaId as string } : {}), ...(Array.isArray(v.etiquetaIds) ? { etiquetaIds: Object.freeze([...v.etiquetaIds].sort() as string[]) } : {}) }))
}
