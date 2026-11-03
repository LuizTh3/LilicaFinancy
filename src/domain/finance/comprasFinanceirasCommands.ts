import { idCartaoValido } from './cartoes'
import { validarCompraFinanceira } from './comprasFinanceiras'
import type { DescritorCompraFinanceira, IntencaoCriacaoCompraFinanceira } from './contracts/comprasFinanceiras'
import { camposPermitidos, falha, registro, sucesso } from './errors'
import type { Resultado } from './errors'
import { canonicalizarComando } from './identity'

export function descritorCompraFinanceiraValido(input: unknown): input is DescritorCompraFinanceira {
  return registro(input) && camposPermitidos(input, ['contractVersion', 'tipo', 'operationKey', 'compraId', 'expectedVersion']) && input.contractVersion === 1 && input.tipo === 'criarCompra' && idCartaoValido(input.operationKey) && idCartaoValido(input.compraId) && input.expectedVersion === 0
}
export function normalizarIntencaoCriacaoCompra(input: unknown): Resultado<IntencaoCriacaoCompraFinanceira> {
  if (!registro(input) || !camposPermitidos(input, ['descritor', 'compra']) || !descritorCompraFinanceiraValido(input.descritor)) return falha('valorInvalido', 'Confira a intenção de criação da compra.')
  const valid = validarCompraFinanceira(input.compra)
  if (!valid.ok) return valid
  const d = input.descritor, c = valid.valor
  if (c.id !== d.compraId || c.ultimoEventoId !== `criarCompra__${d.operationKey}`) return falha('conflitoIdempotencia', 'A compra não corresponde à identidade da intenção.')
  const canonical = canonicalizarComando({ contractVersion: 1, tipo: 'criarCompra', operationKey: d.operationKey, payload: { origemId: c.id, origem: { uid: c.uid }, comando: c.comandoAtual }, expectedVersions: [] })
  return canonical.ok ? sucesso(Object.freeze({ descritor: Object.freeze({ ...d }), compra: c, conferencia: canonical.valor })) : canonical
}
