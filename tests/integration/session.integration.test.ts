import { expect, it } from 'vitest'
import { doc, getDocFromServer, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import { integrationClients } from './support/clients'
import { recordFixture } from './support/manifest'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
it('initializes only missing own profiles, idempotently preserving existing values', async () => {
  const clients = await integrationClients()
  try {
    for (const client of [clients.a, clients.b]) {
      const uid = client.auth.currentUser!.uid, ref = doc(client.db, 'users', uid), before = await getDocFromServer(ref)
      if (!before.exists()) {
        recordFixture(clients.scope, `users/${uid}`, uid)
        await expect(setDoc(ref, { uid, timezone: 'America/Rio_Branco', schemaVersion: 1, primeiro_login: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })).rejects.toMatchObject({ code: 'permission-denied' })
      }
      await Promise.all([1, 2].map(() => runTransaction(client.db, async tx => {
        if (!(await tx.get(ref)).exists()) tx.set(ref, { uid, timezone: 'America/Rio_Branco', schemaVersion: 1, primeiro_login: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      })))
      const after = await getDocFromServer(ref)
      expect(after.data()?.uid).toBe(uid)
      if (before.exists()) expect(after.data()).toEqual(before.data())
      else expect(after.data()?.primeiro_login).toBe(true)
    }
  } finally { await clients.close() }
})
it('clears authentication on logout and resolves B independently from A', async () => {
  const clients = await integrationClients()
  try {
    const { a, scope } = clients
    await signOut(a.auth)
    expect(a.auth.currentUser).toBeNull()
    await expect(getDocFromServer(doc(a.db, 'users', scope.uids[0]))).rejects.toMatchObject({ code: 'permission-denied' })
    await signInWithEmailAndPassword(a.auth, process.env.TEST_USER_B_EMAIL!, process.env.TEST_USER_B_PASSWORD!)
    expect(a.auth.currentUser?.uid).toBe(scope.uids[1])
    await getDocFromServer(doc(a.db, 'users', scope.uids[1]))
    await expect(getDocFromServer(doc(a.db, 'users', scope.uids[0]))).rejects.toMatchObject({ code: 'permission-denied' })
  } finally { await clients.close() }
})
