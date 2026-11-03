import { Timestamp } from 'firebase/firestore'
import { resolverParcelasCompra, validarCompraFinita } from '../../domain/finance/comprasAggregate'
import type { CompraFinita, ParcelaCompraVigente } from '../../domain/finance/contracts/compras'
import { registro } from '../../domain/finance/errors'

const incompat = (): never => { throw Object.assign(new Error('Compra ou parcela incompatível. Atualize a consulta.'), { code: 'schema' }) }
export function decodeCompra(uid: string, id: string, value: unknown): CompraFinita {
  if (!uid || !registro(value) || 'uid' in value || 'id' in value || !(value.createdAt instanceof Timestamp) || !(value.updatedAt instanceof Timestamp)) return incompat()
  if ('canceledAt' in value && !(value.canceledAt instanceof Timestamp)) return incompat()
  const valid = validarCompraFinita({ ...value, uid, id, createdAt: value.createdAt.toMillis(), updatedAt: value.updatedAt.toMillis(), ...(value.canceledAt instanceof Timestamp ? { canceledAt: value.canceledAt.toMillis() } : {}) })
  return valid.ok ? valid.valor : incompat()
}

// A logical item has no authority without its owner and current parent revision.
export function obterParcelaCompra(uid: string, compra: CompraFinita, id: string): ParcelaCompraVigente {
  if (!uid || compra.uid !== uid) return incompat()
  const parcelas = resolverParcelasCompra(compra)
  if (!parcelas.ok) return incompat()
  return parcelas.valor.find(parcela => parcela.id === id) ?? incompat()
}
