import { Timestamp } from 'firebase/firestore'
import { camposPermitidos, registro } from '../../domain/finance/errors'
import { validarCompraFinanceira } from '../../domain/finance/comprasFinanceiras'
import type { CompraFinanceira } from '../../domain/finance/comprasFinanceiras'
import { decodeCompra } from './comprasMapper'
import type { EventoCriacaoCompraFinanceira } from '../../domain/finance/contracts/comprasFinanceiras'
import { idCartaoValido } from '../../domain/finance/cartoes'

/** Only sealed financial v2 records enter this decoder; preview aggregates are not a fallback. */
export function decodeCompraFinanceira(uid: string, id: string, input: unknown): CompraFinanceira {
  const bad = (): never => { throw Object.assign(new Error('Compra sem transição financeira compatível. Atualize a consulta.'), { code: 'schema' }) }
  if (!registro(input) || !registro(input.comandoAtual)) return bad()
  const { comandoAtual, ...raw } = input
  const base = decodeCompra(uid, id, raw)
  const valid = validarCompraFinanceira({ ...base, comandoAtual })
  return valid.ok ? valid.valor : bad()
}
export function decodeEventoCriacaoCompraFinanceira(uid: string, id: string, input: unknown): EventoCriacaoCompraFinanceira {
  const bad = (): never => { throw Object.assign(new Error('Recibo de compra incompatível. Preserve a intenção e consulte o resultado.'), { code: 'schema' }) }
  if (!uid || !registro(input) || !camposPermitidos(input, ['schemaVersion', 'contractVersion', 'tipo', 'operationKey', 'compraId', 'comando', 'createdAt']) || input.schemaVersion !== 1 || input.contractVersion !== 1 || input.tipo !== 'criarCompra' || !idCartaoValido(input.operationKey) || !idCartaoValido(input.compraId) || id !== `criarCompra__${input.operationKey}` || !(input.createdAt instanceof Timestamp) || !registro(input.comando) || !registro(input.comando.depois)) return bad()
  const instante = input.createdAt.toMillis()
  const valid = validarCompraFinanceira({ ...input.comando.depois, uid, id: input.compraId, ultimoEventoId: id, createdAt: instante, updatedAt: instante, comandoAtual: input.comando })
  return valid.ok ? Object.freeze({ id, uid, schemaVersion: 1, contractVersion: 1, tipo: 'criarCompra', operationKey: input.operationKey, compraId: input.compraId, comando: valid.valor.comandoAtual, createdAt: instante }) : bad()
}
