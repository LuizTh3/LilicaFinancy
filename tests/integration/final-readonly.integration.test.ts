import { readFileSync, writeFileSync } from 'node:fs'
import { beforeAll, afterAll, expect, it } from 'vitest'
import { doc, getDocFromServer } from 'firebase/firestore'
import { integrationClients } from './support/clients'
import { createFinanceiroSnapshotReader } from '../../src/infrastructure/firebase/financeiroSnapshotReader'
import { createOrcamentoRodada } from '../../src/infrastructure/firebase/financeiroReadBudget'

// Existing synthetic inventory only: no seed, transaction, publication, migration or cleanup.
let clients: Awaited<ReturnType<typeof integrationClients>>
let externoId: string, faturaId: string, cartaoId: string, mes: string
function inventario(file: string, colecao: string) {
  const manifest = JSON.parse(readFileSync(new URL(`../../.integration/${file}`, import.meta.url), 'utf8'))
  if (manifest.projectId !== 'lilicafinancy' || manifest.projectId !== clients.scope.projectId || !Array.isArray(manifest.uids) || manifest.uids.length !== 4 || !clients.scope.uids.every(uid => manifest.uids.includes(uid)) || !Array.isArray(manifest.documents)) throw Error('FINAL_INVENTORY_SCOPE_MISMATCH')
  const prefix = `users/${clients.scope.uids[0]}/${colecao}/`
  const found = manifest.documents.filter((d: { createdByRun?: boolean; path?: string }) => d.createdByRun === true && typeof d.path === 'string' && d.path.startsWith(prefix) && d.path.slice(prefix.length).indexOf('/') < 0)
  if (!found.length) throw Error('FINAL_SYNTHETIC_FIXTURE_MISSING')
  return [...new Set<string>(found.map((d: { path: string }) => d.path.slice(prefix.length)))].slice(0, 8)
}
async function existente(file: string, colecao: string) {
  for (const id of inventario(file, colecao)) {
    const snap = await getDocFromServer(doc(clients.a.db, 'users', clients.scope.uids[0], colecao, id))
    if (snap.exists()) return id
  }
  throw Error(`FINAL_EXISTING_FIXTURE_NOT_FOUND_${colecao}`)
}
beforeAll(async () => {
  clients = await integrationClients()
  if (clients.scope.projectId !== 'lilicafinancy') throw Error('FINAL_PROJECT_MISMATCH')
  externoId = await existente('externos-us1-20261018-160647.json', 'lancamentosExternos')
  faturaId = await existente('faturas006-final-20261019-04.json', 'faturas')
  if (!/^.+__[0-9]{4}-[0-9]{2}$/.test(faturaId)) throw Error('FINAL_INVOICE_ID_INVALID')
  mes = faturaId.slice(-7); cartaoId = faturaId.slice(0, -9)
  writeFileSync(new URL('../../.integration/final-readonly-inventory.json', import.meta.url), JSON.stringify({ projectId: clients.scope.projectId, clientDate: '2026-10-25', mode: 'existing-synthetic-fixtures-read-only', sources: ['externos-us1-20261018-160647', 'faturas006-final-20261019-04'], maxCandidateReadsPerCollection: 8, paths: [`users/${clients.scope.uids[0]}/lancamentosExternos/${externoId}`, `users/${clients.scope.uids[0]}/faturas/${faturaId}`], financialWrites: false }, null, 2) + '\n')
})
afterAll(async () => { await clients?.close() })

it('SDK real lê as duas fixtures sintéticas do próprio usuário', async () => {
  for (const [collection, id] of [['lancamentosExternos', externoId], ['faturas', faturaId]]) {
    const snap = await getDocFromServer(doc(clients.a.db, 'users', clients.scope.uids[0], collection, id))
    expect(snap.exists()).toBe(true)
  }
})
it('SDK real nega as mesmas duas fixtures para B, administrador, pendente e visitante', async () => {
  for (const client of [clients.b, clients.admin, clients.pending, clients.visitor]) {
    for (const [collection, id] of [['lancamentosExternos', externoId], ['faturas', faturaId]]) await expect(getDocFromServer(doc(client.db, 'users', clients.scope.uids[0], collection, id))).rejects.toHaveProperty('code', 'permission-denied')
  }
})
it('REST autenticado conserva snapshot entre duas fontes, releitura e consulta vazia limitada', async () => {
  const reader = createFinanceiroSnapshotReader({ projectId: clients.scope.projectId, uid: clients.scope.uids[0], generation: 1, atual: () => true, token: () => clients.a.auth.currentUser!.getIdToken() })
  const budget = createOrcamentoRodada()
  try {
    const snapshot = await reader.iniciar(budget)
    const refs = [{ colecao: 'lancamentosExternos' as const, id: externoId }, { colecao: 'faturas' as const, id: faturaId }]
    const first = await reader.obter(snapshot, refs, budget)
    expect(first.every(d => d.dados !== undefined)).toBe(true)
    expect(await reader.obter(snapshot, refs, budget)).toEqual(first)
    const page = await reader.consultar(snapshot, { colecao: 'faturas', cartaoId, inicio: mes, fim: mes, pageSize: 1 }, budget)
    expect(page.map(d => d.id)).toEqual([faturaId])
    const empty = await reader.consultar(snapshot, { colecao: 'faturas', cartaoId: 'final-readonly-empty-20261025', inicio: mes, fim: mes, pageSize: 1 }, budget)
    expect(empty).toEqual([])
    expect(budget.documentos).toBeLessThanOrEqual(100)
    expect(budget.requisicoes).toBeLessThanOrEqual(8)
    reader.invalidarSessao()
    await expect(reader.obter(snapshot, refs)).rejects.toHaveProperty('code', 'semPermissao')
  } finally { reader.invalidarSessao() }
})
