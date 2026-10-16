import { expect, it } from 'vitest'
import { collection, deleteDoc, doc, getDocFromServer, getDocsFromServer, limit, query, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import { integrationClients } from './support/clients'
import { recordFixture, requireFixture } from './support/manifest'
import { integrationEnvironment } from './support/environment'
if (!/^[a-f0-9]{64}$/.test(process.env.TEST_REQUEST_ID ?? '') || process.env.TEST_ADMIN_A_CONFIRMED !== 'yes') throw new Error('Admin bloqueado: indicar fixture da execução e papel A manual já preparado após primeiro acesso')
it('allows a ready manual admin, rejects common/visitor and detects stale versions', async () => {
  requireFixture(integrationEnvironment(process.env), `registrationRequests/${process.env.TEST_REQUEST_ID!}`)
  const clients = await integrationClients()
  try {
    const { a, b, visitor, scope } = clients, id = process.env.TEST_REQUEST_ID!
    expect((await getDocFromServer(doc(a.db, 'admins', scope.uids[0]))).data()?.enabled).toBe(true)
    await getDocsFromServer(query(collection(a.db, 'registrationRequests'), limit(25)))
    await expect(getDocsFromServer(collection(a.db, 'registrationRequests'))).rejects.toMatchObject({ code: 'permission-denied' })
    for (const client of [b, visitor]) {
      await expect(getDocFromServer(doc(client.db, 'registrationRequests', id))).rejects.toMatchObject({ code: 'permission-denied' })
      await expect(getDocsFromServer(query(collection(client.db, 'registrationRequests'), limit(25)))).rejects.toMatchObject({ code: 'permission-denied' })
      await expect(setDoc(doc(client.db, 'subscriptions', id), { requestId: id })).rejects.toMatchObject({ code: 'permission-denied' })
    }
    const ref = doc(a.db, 'subscriptions', id), before = await getDocFromServer(ref)
    if (before.exists()) throw new Error('Fixture deve ter assinatura ausente; não sobrescrever período preexistente')
    recordFixture(scope, `subscriptions/${id}`, scope.uids[0])
    const payload = { requestId: id, startDate: '2026-01-01', endDate: '2026-12-31', version: 1, updatedBy: scope.uids[0], createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
    await expect(setDoc(ref, { ...payload, startDate: '2026-02-30' })).rejects.toMatchObject({ code: 'permission-denied' })
    await setDoc(ref, payload)
    const saveObservedVersion = () => runTransaction(a.db, async tx => {
      const snapshot = await tx.get(ref)
      if (snapshot.data()?.version !== 1) throw new Error('STALE_VERSION')
      tx.update(ref, { endDate: '2027-01-01', version: 2, updatedAt: serverTimestamp(), updatedBy: scope.uids[0] })
    })
    const results = await Promise.allSettled([saveObservedVersion(), saveObservedVersion()])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect((await getDocFromServer(ref)).data()?.version).toBe(2)
    await expect(deleteDoc(ref)).rejects.toMatchObject({ code: 'permission-denied' })
    await expect(getDocFromServer(doc(a.db, 'users', scope.uids[1]))).rejects.toMatchObject({ code: 'permission-denied' })
  } finally { await clients.close() }
})
