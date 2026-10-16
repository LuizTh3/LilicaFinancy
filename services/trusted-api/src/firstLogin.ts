import { exactKeys } from '../../../src/domain/registration'
import type { Env } from './environment'
import type { Identity } from './googleAuth'
import { authCall, lookup } from './googleAuth'
import { HttpError } from './contracts'
import { Store, stamp, milliseconds } from './firestoreRest'
import type { Data } from './firestoreRest'

export function validatePasswordBody(body: unknown): { newPassword: string; confirmPassword: string } {
  try { exactKeys(body, ['newPassword', 'confirmPassword']) } catch { throw new HttpError('INVALID_INPUT') }
  if (typeof body.newPassword !== 'string' || !body.newPassword || body.newPassword !== body.confirmPassword || body.newPassword.length > 4096) throw new HttpError('INVALID_INPUT')
  return body as { newPassword: string; confirmPassword: string }
}
export function differentPasswordResult(result: { ok: boolean; code?: string }) {
  if (result.ok) throw new HttpError('SAME_PASSWORD')
  if (result.code !== 'INVALID_LOGIN_CREDENTIALS') throw new HttpError('DEPENDENCY_UNAVAILABLE', 503)
}
export function assertLease(op: Data | null, key: string, version: number, now: number) {
  if (!op || op.operationId !== key || op.attemptVersion !== version || op.state !== 'prepared' || milliseconds(op.leaseUntil) <= now || !Number.isFinite(milliseconds(op.leaseUntil))) throw new HttpError('OPERATION_BUSY', 409)
}
function receipt(profile: Data) {
  const cutoff = milliseconds(profile.passwordChangeCompletedAt)
  if (profile.primeiro_login !== false || !Number.isFinite(cutoff)) throw new HttpError('PROFILE_INTEGRITY', 409)
  return { status: 'completed' as const, reloginRequired: true as const, loginAvailableAt: (Math.floor(cutoff / 1000) + 1) * 1000 }
}
export async function normalizeProfile(store: Store, identity: Identity) {
  await store.atomic(async tx => {
    const path = `users/${identity.uid}`
    const profile = await tx.get(path)
    if (!profile || profile.schemaVersion !== 1 || profile.uid !== identity.uid) throw new HttpError('UNSUPPORTED_PROFILE', 409)
    if (profile.primeiro_login === undefined) tx.put(path, { ...profile, primeiro_login: true }, ['updatedAt'])
    else if (typeof profile.primeiro_login !== 'boolean') throw new HttpError('PROFILE_INTEGRITY', 409)
  })
  return { status: 'normalized' }
}
export async function changePassword(env: Env, store: Store, identity: Identity, key: string, input: unknown) {
  const body = validatePasswordBody(input)
  const profilePath = `users/${identity.uid}`
  const opPath = `firstLoginOperations/${identity.uid}`
  const prepared = await store.atomic(async tx => {
    const profile = await tx.get(profilePath)
    const op = await tx.get(opPath)
    if (!profile || profile.schemaVersion !== 1 || profile.uid !== identity.uid) throw new HttpError('UNSUPPORTED_PROFILE', 409)
    if (op?.state === 'completed' && op.operationId === key) return { done: receipt(profile) }
    if (profile.primeiro_login === false) throw new HttpError('PROFILE_INTEGRITY', 409)
    if (profile.primeiro_login !== true && profile.primeiro_login !== undefined) throw new HttpError('PROFILE_INTEGRITY', 409)
    const now = Date.now()
    if (now / 1000 - identity.authTime > 300) throw new HttpError('REAUTH_REQUIRED', 401)
    if (op?.state === 'prepared' && milliseconds(op.leaseUntil) > now) throw new HttpError('OPERATION_BUSY', 409)
    const window = Math.floor(now / 900000)
    const budgetPath = `operationBudgets/password-${identity.uid}-${window}`
    const budget = await tx.get(budgetPath)
    const count = Number(budget?.count ?? 0)
    if (count >= 5) throw new HttpError('RATE_LIMITED', 429)
    const version = Number(op?.attemptVersion ?? 0) + 1
    tx.put(budgetPath, { count: count + 1, windowStart: stamp(window * 900000), expiresAt: stamp((window + 1) * 900000) })
    tx.put(opPath, { uid: identity.uid, operationId: key, attemptVersion: version, state: 'prepared', baselinePasswordUpdatedAt: identity.passwordUpdatedAt, leaseUntil: stamp(now + 30000), ...(op?.createdAt ? { createdAt: op.createdAt } : {}) }, op?.createdAt ? ['updatedAt'] : ['createdAt', 'updatedAt'])
    return { version }
  })
  if ('done' in prepared) return prepared.done
  let authMayHaveChanged = false
  try {
    differentPasswordResult(await authCall(env, 'signInWithPassword', { email: identity.email, password: body.newPassword, returnSecureToken: true }))
    const coherent = await lookup(env, identity.uid)
    if (coherent.email !== identity.email || (coherent.passwordUpdatedAt ?? 0) !== identity.passwordUpdatedAt) throw new HttpError('REAUTH_REQUIRED', 401)
    assertLease(await store.get(opPath), key, prepared.version!, Date.now())
    // The request timeout is 10 s. Reserve that budget before starting an irreversible Auth call.
    const lease = await store.get(opPath)
    assertLease(lease, key, prepared.version!, Date.now() + 11000)
    authMayHaveChanged = true
    const updated = await authCall(env, 'update', { idToken: identity.token, password: body.newPassword, returnSecureToken: true })
    if (!updated.ok) {
      authMayHaveChanged = false
      throw new HttpError(updated.code?.startsWith('WEAK_PASSWORD') || updated.code === 'PASSWORD_DOES_NOT_MEET_REQUIREMENTS' ? 'PASSWORD_POLICY' : 'REAUTH_REQUIRED', 400)
    }
    if (updated.uid !== identity.uid) throw new HttpError('PASSWORD_CHANGE_UNCERTAIN', 503)
    await store.atomic(async tx => {
      const op = await tx.get(opPath)
      const profile = await tx.get(profilePath)
      assertLease(op, key, prepared.version!, Date.now())
      if (!profile || profile.primeiro_login === false) throw new HttpError('PROFILE_INTEGRITY', 409)
      tx.put(opPath, { ...op, state: 'completed' }, ['completedAt', 'updatedAt'])
      tx.put(profilePath, { ...profile, primeiro_login: false }, ['passwordChangeCompletedAt', 'updatedAt'])
    })
    const confirmed = await store.get(profilePath)
    if (!confirmed) throw new HttpError('PASSWORD_CHANGE_UNCERTAIN', 503)
    return receipt(confirmed)
  } catch (error) {
    // A lost response to the commit can already have completed; preserve a durable receipt.
    try {
      const op = await store.get(opPath)
      if (op?.state === 'completed' && op.operationId === key) {
        const profile = await store.get(profilePath)
        if (profile) return receipt(profile)
      }
      await store.atomic(async tx => {
        const current = await tx.get(opPath)
        if (current?.operationId === key && current.attemptVersion === prepared.version && current.state === 'prepared') tx.put(opPath, { ...current, state: 'uncertain', leaseUntil: stamp(Date.now()) }, ['updatedAt'])
      })
    } catch { /* Fail closed; lease eventually expires. */ }
    if (authMayHaveChanged) throw new HttpError('PASSWORD_CHANGE_UNCERTAIN', 503)
    throw error
  }
}
