import { expect, it } from 'vitest'
import { validatePasswordBody, differentPasswordResult, assertLease } from './firstLogin'
import { stamp } from './firestoreRest'

it('rejects current password and every ambiguous Auth error', () => {
  expect(() => differentPasswordResult({ ok: true })).toThrow('SAME_PASSWORD')
  for (const code of ['TOO_MANY_ATTEMPTS_TRY_LATER', 'INVALID_PASSWORD', undefined]) expect(() => differentPasswordResult({ ok: false, code })).toThrow()
  expect(() => differentPasswordResult({ ok: false, code: 'INVALID_LOGIN_CREDENTIALS' })).not.toThrow()
})
it('requires two exact password fields without UID injection', () => {
  expect(() => validatePasswordBody({ newPassword: '', confirmPassword: '' })).toThrow()
  expect(() => validatePasswordBody({ newPassword: 'one', confirmPassword: 'two' })).toThrow()
  expect(() => validatePasswordBody({ newPassword: 'one', confirmPassword: 'one', uid: 'other' })).toThrow()
})
it('stops stale or expired lease holders', () => {
  const op = { operationId: 'key', attemptVersion: 2, leaseUntil: stamp(5000), state: 'prepared' }
  expect(() => assertLease(op, 'key', 1, 1000)).toThrow()
  expect(() => assertLease(op, 'key', 2, 5000)).toThrow()
  expect(() => assertLease(op, 'key', 2, 4999)).not.toThrow()
})
