import { dataCalendario } from './calendar'
import { camposPermitidos, falha, registro, sucesso, texto } from './errors'
import type { Resultado } from './errors'

declare const centavosMarca: unique symbol
declare const positivoMarca: unique symbol
export type Centavos = number & { readonly [centavosMarca]: true }
export type ValorPositivo = Centavos & { readonly [positivoMarca]: true }
export const MAX_CENTAVOS = Number.MAX_SAFE_INTEGER
const MAX = BigInt(MAX_CENTAVOS)
const invalido = () => falha('valorInvalido', 'Informe um valor em centavos inteiros válido.', { recuperacao: 'corrigir' })
const excedido = () => falha('limiteMonetario', 'O cálculo excede o limite monetário seguro.', { limite: MAX_CENTAVOS, recuperacao: 'corrigir' })
export function centavos(value: unknown): Resultado<Centavos> {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) return invalido()
  if (!Number.isSafeInteger(value)) return excedido()
  return sucesso((value === 0 ? 0 : value) as Centavos)
}
export function valorPositivo(value: unknown): Resultado<ValorPositivo> {
  const result = centavos(value)
  return result.ok ? result.valor > 0 ? sucesso(result.valor as ValorPositivo) : invalido() : result
}
function deInteiro(value: bigint): Resultado<Centavos> {
  return value < 0n ? invalido() : value > MAX ? excedido() : sucesso(Number(value) as Centavos)
}
export function interpretarBRL(value: unknown): Resultado<Centavos> {
  if (typeof value !== 'string') return invalido()
  const body = value.trim().replace(/^R\$(?: |\u00a0)?/, '')
  if (!/^(?:[0-9]+|[0-9]{1,3}(?:\.[0-9]{3})+)(?:,[0-9]{1,2})?$/.test(body)) return invalido()
  const [whole, fraction = ''] = body.split(',')
  const digits = (whole.replace(/\./g, '') + fraction.padEnd(2, '0')).replace(/^0+/, '') || '0'
  return digits.length > 16 ? excedido() : deInteiro(BigInt(digits))
}
export function formatarBRL(value: unknown): Resultado<string> {
  const valid = centavos(value)
  if (!valid.ok) return valid
  const digits = String(valid.valor).padStart(3, '0')
  return sucesso(`R$ ${digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${digits.slice(-2)}`)
}
export function somarCentavos(values: unknown): Resultado<Centavos> {
  if (!Array.isArray(values)) return invalido()
  let sum = 0n
  for (const value of values) {
    const valid = centavos(value)
    if (!valid.ok) return valid
    sum += BigInt(valid.valor)
    if (sum > MAX) return excedido()
  }
  return deInteiro(sum)
}
export function compararCentavos(a: unknown, b: unknown): Resultado<-1 | 0 | 1> {
  const left = centavos(a), right = centavos(b)
  if (!left.ok) return left
  if (!right.ok) return right
  return sucesso(left.valor < right.valor ? -1 : left.valor > right.valor ? 1 : 0)
}
export function subtrairCentavos(a: unknown, b: unknown): Resultado<Centavos> {
  const left = centavos(a), right = centavos(b)
  if (!left.ok) return left
  if (!right.ok) return right
  return deInteiro(BigInt(left.valor) - BigInt(right.valor))
}
export function multiplicarCentavos(value: unknown, quantidade: unknown): Resultado<Centavos> {
  const valid = centavos(value)
  if (!valid.ok) return valid
  if (typeof quantidade !== 'number' || !Number.isSafeInteger(quantidade) || quantidade < 0) return invalido()
  return deInteiro(BigInt(valid.valor) * BigInt(quantidade))
}
export type Diferenca = Readonly<{ natureza: 'superavit' | 'deficit' | 'equilibrio'; magnitudeCentavos: Centavos }>
export function diferencaMonetaria(entradas: unknown, saidas: unknown): Resultado<Diferenca> {
  const comparison = compararCentavos(entradas, saidas)
  if (!comparison.ok) return comparison
  const magnitude = comparison.valor < 0 ? subtrairCentavos(saidas, entradas) : subtrairCentavos(entradas, saidas)
  return magnitude.ok ? sucesso({ natureza: comparison.valor < 0 ? 'deficit' : comparison.valor > 0 ? 'superavit' : 'equilibrio', magnitudeCentavos: magnitude.valor }) : magnitude
}
export function distribuirParcelas(total: unknown, quantidade: unknown): Resultado<readonly ValorPositivo[]> {
  const valid = valorPositivo(total)
  if (!valid.ok) return valid
  if (typeof quantidade !== 'number' || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 12) return falha('limiteOperacional', 'Informe de 1 a 12 parcelas.', { limite: 12, recuperacao: 'corrigir' })
  if (valid.valor < quantidade) return invalido()
  const t = BigInt(valid.valor), n = BigInt(quantidade), quotient = t / n, remainder = t % n
  return sucesso(Array.from({ length: quantidade }, (_, i) => Number(quotient + (BigInt(i) < remainder ? 1n : 0n)) as ValorPositivo))
}
export function aplicarCreditoObrigacao(saldo: unknown, credito: unknown): Resultado<Centavos> {
  if (!registro(credito) || !camposPermitidos(credito, ['tipo', 'valorCentavos', 'origemId', 'motivo', 'dataEfeito']) || credito.tipo !== 'creditoObrigacao' || !texto(credito.origemId, 64) || !/^[A-Za-z0-9_-]+$/.test(credito.origemId) || !texto(credito.motivo, 1000) || !dataCalendario(credito.dataEfeito).ok) return invalido()
  const value = valorPositivo(credito.valorCentavos)
  return value.ok ? subtrairCentavos(saldo, value.valor) : value
}
