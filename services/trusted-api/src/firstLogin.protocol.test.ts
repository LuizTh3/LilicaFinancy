import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { changePassword } from './firstLogin'
import { Store } from './firestoreRest'
import type { Env } from './environment'
import { authCall, lookup } from './googleAuth'

vi.mock('./googleAuth', () => ({ serviceToken: vi.fn(async () => 'unit-oauth'), authCall: vi.fn(), lookup: vi.fn() }))
const env = { EXPECTED_PROJECT_ID: 'example-project' } as Env
const identity = { uid: 'A', email: 'fixture@example.com', token: 'unit-token', authTime: 1, passwordUpdatedAt: 0 }
function document(data: Record<string, unknown>) {
  return Response.json({ fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key,
    typeof value === 'boolean' ? { booleanValue: value } : typeof value === 'number' ? { integerValue: String(value) } : typeof value === 'object' ? value : { stringValue: value },
  ])) })
}
function transport(responses: Response[]) {
  const calls: { url: string; body?: string }[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, body: init?.body as string | undefined })
    const response = responses.shift()
    if (!response) throw new Error('UNEXPECTED_TRANSPORT_CALL')
    return response
  }))
  return calls
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(1000); vi.clearAllMocks() })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
it('returns a durable receipt on retry without calling Auth again', async () => {
  const responses = [Response.json({ transaction: 'one' }), document({ uid: 'A', schemaVersion: 1, primeiro_login: false, passwordChangeCompletedAt: { timestampValue: '1970-01-01T00:00:01.500Z' } }), document({ operationId: 'key', state: 'completed' }), Response.json({})]
  transport(responses)
  const result = await changePassword(env, new Store(env), identity, 'key', { newPassword: 'fixture-value', confirmPassword: 'fixture-value' })
  expect(result).toEqual({ status: 'completed', reloginRequired: true, loginAvailableAt: 2000 })
  expect(authCall).not.toHaveBeenCalled(); expect(responses).toHaveLength(0)
})
it('fails closed after Auth success when the protected commit is unavailable', async () => {
  const profile = () => document({ uid: 'A', schemaVersion: 1, primeiro_login: true })
  const prepared = () => document({ uid: 'A', operationId: 'key', attemptVersion: 1, state: 'prepared', leaseUntil: { timestampValue: '1970-01-01T00:00:31.000Z' } })
  const missing = () => new Response('', { status: 404 })
  const responses = [
    Response.json({ transaction: 'one' }), profile(), missing(), missing(), Response.json({}),
    prepared(), prepared(), Response.json({ transaction: 'two' }), prepared(), profile(),
    new Response('', { status: 503 }), Response.json({}), prepared(),
    Response.json({ transaction: 'three' }), prepared(), Response.json({}),
  ]
  const calls = transport(responses)
  vi.mocked(authCall).mockResolvedValueOnce({ ok: false, uid: undefined, code: 'INVALID_LOGIN_CREDENTIALS' }).mockResolvedValueOnce({ ok: true, uid: 'A', code: undefined })
  vi.mocked(lookup).mockResolvedValue({ localId: 'A', email: identity.email, passwordUpdatedAt: 0, providerUserInfo: [{ providerId: 'password' }] })
  await expect(changePassword(env, new Store(env), identity, 'key', { newPassword: 'fixture-value', confirmPassword: 'fixture-value' })).rejects.toMatchObject({ code: 'PASSWORD_CHANGE_UNCERTAIN' })
  expect(authCall).toHaveBeenCalledTimes(2)
  const commits = calls.filter(call => call.url.endsWith(':commit')).map(call => JSON.parse(call.body!))
  expect(commits.at(-1).writes[0].update.fields.state).toEqual({ stringValue: 'uncertain' })
  expect(JSON.stringify(commits)).not.toContain('fixture-value')
  expect(responses).toHaveLength(0)
})
