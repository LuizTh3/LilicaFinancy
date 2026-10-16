import { expect, it } from 'vitest'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDocFromServer, updateDoc } from 'firebase/firestore'
import { integrationClients } from './support/clients'
if (process.env.TEST_ALLOW_PASSWORD_CHANGE !== 'yes' || !process.env.TEST_USER_A_NEW_PASSWORD || !process.env.TEST_TRUSTED_API_BASE_URL) throw new Error('Primeiro acesso bloqueado: autorize somente conta dedicada e configure nova senha/API em secrets locais')
it('requires a protected password change, logout and new authentication', async () => {
  const clients = await integrationClients()
  try {
    const { a, scope } = clients, ref = doc(a.db, 'users', scope.uids[0]), before = await getDocFromServer(ref)
    expect(before.data()?.primeiro_login).toBe(true)
    const provisionalToken = await a.auth.currentUser!.getIdToken(), key = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
    await expect(updateDoc(ref, { primeiro_login: false })).rejects.toMatchObject({ code: 'permission-denied' })
    const call = (password: string) => fetch(process.env.TEST_TRUSTED_API_BASE_URL! + '/v1/first-login/change-password', { method: 'POST', headers: { Origin: process.env.TEST_APP_ORIGIN!, 'Content-Type': 'application/json', Authorization: `Bearer ${provisionalToken}`, 'Idempotency-Key': key }, body: JSON.stringify({ newPassword: password, confirmPassword: password }) })
    const same = await call(process.env.TEST_USER_A_PASSWORD!)
    expect((await same.json()).code).toBe('SAME_PASSWORD')
    // A rejected attempt released its lease; same operation identity can be retried safely.
    const changed = await call(process.env.TEST_USER_A_NEW_PASSWORD!)
    expect(changed.status).toBe(200)
    const receipt = await changed.json() as { reloginRequired: boolean; loginAvailableAt: number }
    expect(receipt.reloginRequired).toBe(true)
    expect((await getDocFromServer(ref)).data()?.primeiro_login).toBe(false)
    await expect(getDocFromServer(doc(a.db, 'admins', scope.uids[0]))).rejects.toMatchObject({ code: 'permission-denied' })
    await signOut(a.auth)
    await expect(signInWithEmailAndPassword(a.auth, process.env.TEST_USER_A_EMAIL!, process.env.TEST_USER_A_PASSWORD!)).rejects.toBeDefined()
    const delay = Math.max(0, receipt.loginAvailableAt - Date.now())
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, Math.min(delay + 100, 3000)))
    await signInWithEmailAndPassword(a.auth, process.env.TEST_USER_A_EMAIL!, process.env.TEST_USER_A_NEW_PASSWORD!)
    expect((await getDocFromServer(ref)).data()?.primeiro_login).toBe(false)
    await getDocFromServer(doc(a.db, 'admins', scope.uids[0]))
  } finally { await clients.close() }
})
