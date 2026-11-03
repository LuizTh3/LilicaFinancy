import { afterAll, beforeAll, expect, it } from 'vitest'
import { doc, getDocFromServer } from 'firebase/firestore'
import { integrationClients } from './support/clients'
import { painelManifest } from './support/painelFixtures'
import { createFinanceiroSnapshotReader } from '../../src/infrastructure/firebase/financeiroSnapshotReader'

// Read-only. Synthetic records must already exist under the exact authorized run.
// Concurrent mutation proof is added by US1/T025; this suite alone is not G0-remoto PASS.
let clients: Awaited<ReturnType<typeof integrationClients>>
let manifest: ReturnType<typeof painelManifest>
beforeAll(async () => { clients = await integrationClients(); manifest = painelManifest(clients.scope, process.env.TEST_PAINEL_MONTH!) })
afterAll(async () => { await clients?.close() })
it('preserva instante do servidor entre fontes, dependências e consulta vazia', async () => {
 const reader = createFinanceiroSnapshotReader({ projectId: clients.scope.projectId, uid: clients.scope.uids[0], generation: 1, atual: () => true, token: () => clients.a.auth.currentUser!.getIdToken() })
 try {
  const snapshot = await reader.iniciar()
  const refs = [{ colecao: 'lancamentosExternos' as const, id: manifest.externoId }, { colecao: 'faturas' as const, id: manifest.faturaId }]
  const docs = await reader.obter(snapshot, refs)
  expect(docs.every(d => d.dados !== undefined)).toBe(true)
  const empty = await reader.consultar(snapshot, { colecao: 'faturas', cartaoId: manifest.cartaoVazioId, inicio: manifest.month, fim: manifest.month, pageSize: 1 })
  expect(empty).toEqual([])
  expect(await reader.obter(snapshot, refs)).toEqual(docs)
 } finally { reader.invalidarSessao() }
})
it('nega acesso direto às fixturesA para B/admin/pendente/visitante', async () => {
 for (const client of [clients.b, clients.admin, clients.pending, clients.visitor]) for (const path of manifest.paths) await expect(getDocFromServer(doc(client.db, path))).rejects.toHaveProperty('code', 'permission-denied')
})
