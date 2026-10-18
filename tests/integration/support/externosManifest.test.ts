import { expect, it } from 'vitest'
import { validateManifest } from './manifest'
import type { Manifest } from './manifest'
import { cleanupOrder } from './cleanup'

const doc = (path: string) => ({ path, owner: 'A', createdByRun: true as const, registeredAt: '2026-10-18T00:00:00Z' })
const base: Manifest = { projectId: 'p', runId: 'run12345', uids: ['A'], documents: [
 doc('users/A/lancamentosExternos/origin-1'), doc('users/A/operacoesExternas/pagar__key-1'),
 doc('users/A/operacoesExternas/reverterPagamento__key-2'), doc('users/A/reversoesExternas/pagar__key-1')
] }
it('aceita somente as três coleções e identidades financeiras fechadas no manifesto', () => {
 expect(validateManifest(base, 'p', 'run12345', ['A'])).toHaveLength(4)
 for (const path of ['users/B/lancamentosExternos/id', 'users/A/pagamentos/id', 'users/A/lancamentosExternos/id_1', 'users/A/operacoesExternas/arbitrary__key', 'users/A/operacoesExternas/pagar__../key', 'users/A/reversoesExternas/reverterPagamento__key-2']) {
  expect(() => validateManifest({ ...base, documents: [...base.documents, doc(path)] }, 'p', 'run12345', ['A'])).toThrow('MANIFEST_SCOPE')
 }
 expect(() => validateManifest({ ...base, documents: [doc('users/A/reversoesExternas/pagar__missing')] }, 'p', 'run12345', ['A'])).toThrow('MANIFEST_SCOPE')
})
it('ordena marcador antes do original e mantém pais depois dos filhos inventariados', () => {
 const docs = [...base.documents, doc('users/A')]
 expect(cleanupOrder(docs).map(d => d.path)).toEqual([
  'users/A/reversoesExternas/pagar__key-1',
  'users/A/operacoesExternas/pagar__key-1',
  'users/A/operacoesExternas/reverterPagamento__key-2',
  'users/A/lancamentosExternos/origin-1', 'users/A'
 ])
})
