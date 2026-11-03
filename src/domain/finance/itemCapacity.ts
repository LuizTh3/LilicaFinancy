import { camposPermitidos, falha, registro, sucesso } from './errors'
import type { Resultado } from './errors'
import { centavos, somarCentavos, subtrairCentavos, valorPositivo } from './money'
import { idCartaoValido } from './cartoes'

export type CapacidadeItem = Readonly<{ schemaVersion: 1; valorOriginalCentavos: number; correcaoAcrescimosCentavos: number; correcaoReducoesCentavos: number; devolvidoCentavos: number; categoriaEfetivaId: string }>
const campos = ['schemaVersion', 'valorOriginalCentavos', 'correcaoAcrescimosCentavos', 'correcaoReducoesCentavos', 'devolvidoCentavos', 'categoriaEfetivaId']
const erro = () => falha('integridadeIndeterminada', 'A capacidade financeira do item está ausente ou inconsistente.', { recuperacao: 'reler' })
export function validarCapacidadeItem(input: unknown): Resultado<CapacidadeItem> {
  if (!registro(input) || !camposPermitidos(input, campos) || campos.some(k => !(k in input)) || input.schemaVersion !== 1 || !idCartaoValido(input.categoriaEfetivaId) || !valorPositivo(input.valorOriginalCentavos).ok || !['correcaoAcrescimosCentavos', 'correcaoReducoesCentavos', 'devolvidoCentavos'].every(k => centavos(input[k]).ok)) return erro()
  const soma = somarCentavos([input.valorOriginalCentavos, input.correcaoAcrescimosCentavos])
  if (!soma.ok) return soma
  const corrigido = subtrairCentavos(soma.valor, input.correcaoReducoesCentavos)
  if (!corrigido.ok) return erro()
  const liquido = subtrairCentavos(corrigido.valor, input.devolvidoCentavos)
  return liquido.ok ? sucesso(Object.freeze({ ...input } as CapacidadeItem)) : erro()
}
export function criarCapacidadeItem(valorOriginalCentavos: unknown, categoriaEfetivaId: unknown): Resultado<CapacidadeItem> {
  return validarCapacidadeItem({ schemaVersion: 1, valorOriginalCentavos, categoriaEfetivaId, correcaoAcrescimosCentavos: 0, correcaoReducoesCentavos: 0, devolvidoCentavos: 0 })
}
/** Pure item capacity. Credits, refund facts and reciprocal events require their own atomic command. */
export function ajustarCapacidadeItem(input: unknown, comando: unknown): Resultado<{ capacidade: CapacidadeItem; valorCorrigidoCentavos: number; valorLiquidoCentavos: number }> {
  const valid = validarCapacidadeItem(input)
  if (!valid.ok) return valid
  if (!registro(comando) || !camposPermitidos(comando, ['tipo', 'valorCentavos']) || !valorPositivo(comando.valorCentavos).ok || !['acrescimo', 'reducao', 'devolucao'].includes(String(comando.tipo))) return erro()
  const campo = comando.tipo === 'acrescimo' ? 'correcaoAcrescimosCentavos' : comando.tipo === 'reducao' ? 'correcaoReducoesCentavos' : 'devolvidoCentavos'
  const valor = somarCentavos([valid.valor[campo], comando.valorCentavos])
  if (!valor.ok) return valor
  const next = validarCapacidadeItem({ ...valid.valor, [campo]: valor.valor })
  if (!next.ok) return next
  const soma = somarCentavos([next.valor.valorOriginalCentavos, next.valor.correcaoAcrescimosCentavos])
  if (!soma.ok) return soma
  const corrigido = subtrairCentavos(soma.valor, next.valor.correcaoReducoesCentavos)
  if (!corrigido.ok) return corrigido
  const liquido = subtrairCentavos(corrigido.valor, next.valor.devolvidoCentavos)
  return liquido.ok ? sucesso({ capacidade: next.valor, valorCorrigidoCentavos: corrigido.valor, valorLiquidoCentavos: liquido.valor }) : liquido
}
