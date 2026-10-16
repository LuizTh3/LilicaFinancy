import { afterEach, expect, it, vi } from 'vitest'
import { register, hmac } from './registration'
import { Store } from './firestoreRest'
import type { Env } from './environment'
vi.mock('./googleAuth', () => ({ serviceToken: vi.fn(async () => 'unit-oauth') }))
afterEach(() => vi.unstubAllGlobals())
const env = { EXPECTED_PROJECT_ID: 'example-project', TURNSTILE_SECRET_KEY: 'unit-secret', TURNSTILE_HOSTNAME: 'app.example.com', SUBMISSION_HMAC_SECRET: 'unit-hmac', NETWORK_HASH_SECRET: 'unit-network' } as Env
const data = { fullName: 'Pessoa Fictícia', cpf: '52998224725', whatsapp: '+5568999991234', email: 'fixture@example.com' }
function transport(responses: Response[]) {
  const fetch = vi.fn(async () => { const response = responses.shift(); if (!response) throw new Error('UNEXPECTED_CALL'); return response })
  vi.stubGlobal('fetch', fetch)
  return fetch
}
const challenge = () => Response.json({ success: true, hostname: 'app.example.com', action: 'registration' })
it('returns the same receipt for a canonical replay without creating another outbox', async () => {
  const fingerprint = await hmac(env.SUBMISSION_HMAC_SECRET, JSON.stringify(data))
  const responses = [challenge(), Response.json({ transaction: 'one' }), Response.json({ fields: { payloadFingerprint: { stringValue: fingerprint } } }), Response.json({})]
  const fetch = transport(responses)
  const result = await register(env, new Store(env), 'a'.repeat(43), { ...data, turnstileToken: 'human-challenge-placeholder' }, 'unit-network')
  expect(result.repeated).toBe(true)
  expect(result.receipt).not.toHaveProperty('cpf')
  const commitInit = fetch.mock.calls.at(-1) as unknown as [string, RequestInit]
  expect(JSON.parse(String(commitInit[1].body)).writes).toEqual([])
})
it('rejects divergent replay without returning the previous personal data', async () => {
  transport([challenge(), Response.json({ transaction: 'one' }), Response.json({ fields: { payloadFingerprint: { stringValue: 'different-fingerprint' } } }), Response.json({})])
  await expect(register(env, new Store(env), 'a'.repeat(43), { ...data, turnstileToken: 'human-challenge-placeholder' }, 'unit-network')).rejects.toMatchObject({ code: 'OPERATION_CONFLICT' })
})
it('refuses a full global budget before any registration writes', async () => {
  const missing = new Response('', { status: 404 })
  const fetch = transport([challenge(), Response.json({ transaction: 'one' }), missing, new Response('', { status: 404 }), Response.json({ fields: { count: { integerValue: '100' } } }), Response.json({})])
  await expect(register(env, new Store(env), 'a'.repeat(43), { ...data, turnstileToken: 'human-challenge-placeholder' }, 'unit-network')).rejects.toMatchObject({ code: 'RATE_LIMITED' })
  expect(fetch.mock.calls.some(call => String((call as unknown as [string])[0]).endsWith(':commit'))).toBe(false)
})
