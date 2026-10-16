import { doc, getDocFromServer, runTransaction, serverTimestamp } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { firebase } from './client'
import { trustedApi } from '../trusted-api/client'

export async function loadProfile(user: User) {
  const { db } = firebase()
  const ref = doc(db, 'users', user.uid)
  let snapshot = await getDocFromServer(ref)
  if (!snapshot.exists()) {
    await runTransaction(db, async tx => {
      const existing = await tx.get(ref)
      if (!existing.exists()) tx.set(ref, { uid: user.uid, timezone: 'America/Rio_Branco', schemaVersion: 1, primeiro_login: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    })
    snapshot = await getDocFromServer(ref)
  }
  let data = snapshot.data()
  if (!data || data.uid !== user.uid) throw new Error('PROFILE_INTEGRITY')
  if (data.schemaVersion === 1 && data.primeiro_login === undefined) {
    await trustedApi('first-login/normalize-profile', {}, undefined, await user.getIdToken())
    data = (await getDocFromServer(ref)).data()
  }
  if (!data) throw new Error('PROFILE_INTEGRITY')
  return { ...data, schemaVersion: data.schemaVersion, primeiro_login: data.primeiro_login, completedAt: data.passwordChangeCompletedAt?.toMillis?.() as number | undefined }
}
