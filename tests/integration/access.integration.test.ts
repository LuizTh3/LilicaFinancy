import { afterAll, beforeAll, expect, it } from 'vitest'
import { collection, deleteDoc, doc, getDocFromServer, getDocsFromServer, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { integrationClients } from './support/clients'
let clients: Awaited<ReturnType<typeof integrationClients>>
beforeAll(async () => { clients = await integrationClients() })
afterAll(async () => { await clients?.close() })
const denied = (operation: Promise<unknown>) => expect(operation).rejects.toMatchObject({ code: 'permission-denied' })
it('denies cross-user and visitor profile CRUD/list, including released flags', async () => {
  for (const [client, uid] of [[clients.a, clients.scope.uids[1]], [clients.b, clients.scope.uids[0]], [clients.visitor, clients.scope.uids[0]]] as const) {
    const ref = doc(client.db, 'users', uid)
    await denied(getDocFromServer(ref)); await denied(getDocsFromServer(collection(client.db, 'users')))
    await denied(setDoc(ref, { uid, primeiro_login: false, schemaVersion: 1, timezone: 'America/Rio_Branco', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }))
    await denied(updateDoc(ref, { primeiro_login: false })); await denied(deleteDoc(ref))
  }
  for (const client of [clients.a, clients.b]) {
    const uid = client.auth.currentUser!.uid, ref = doc(client.db, 'users', uid)
    await getDocFromServer(ref)
    for (const patch of [{ primeiro_login: false }, { passwordChangeCompletedAt: serverTimestamp() }, { uid: 'other' }, { schemaVersion: 9 }, { createdAt: serverTimestamp() }]) await denied(updateDoc(ref, patch))
    await denied(deleteDoc(ref)); await denied(setDoc(doc(client.db, 'admins', uid), { enabled: true }))
  }
})
it('denies financial/future subcollections and internal operation collections to every actor', async () => {
  for (const client of [clients.a, clients.b, clients.visitor]) {
    for (const path of [`users/${clients.scope.uids[0]}/cards`, `users/${clients.scope.uids[1]}/payments`, 'purchases', 'firstLoginOperations', 'submissionOperations', 'operationBudgets']) {
      const ref = doc(client.db, path, clients.scope.runId + '-denied')
      await denied(getDocFromServer(ref)); await denied(getDocsFromServer(collection(client.db, path)))
      await denied(setDoc(ref, { fixture: true })); await denied(updateDoc(ref, { fixture: false })); await denied(deleteDoc(ref))
    }
  }
})
