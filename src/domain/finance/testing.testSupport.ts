import type { Resultado } from './errors'
export function ler<T>(result: Resultado<T>): T {
  if (!result.ok) throw new Error(result.erro.codigo)
  return result.valor
}
export function congelar<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(congelar)
    Object.freeze(value)
  }
  return value
}
