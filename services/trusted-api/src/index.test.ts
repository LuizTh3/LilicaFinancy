import { afterEach, expect, it, vi } from 'vitest'
import worker from './index'
import type { Env } from './environment'
const env = { ALLOWED_ORIGINS: 'https://app.example.com' } as Env
afterEach(() => vi.unstubAllGlobals())
it('returns only safe dependency diagnostics, never the upstream body or secrets', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('private-upstream-body', { status: 502 })))
  const configured = { ...env, EXPECTED_PROJECT_ID: 'example', GOOGLE_SERVICE_ACCOUNT_EMAIL: 'fixture@example.com', GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: 'private-key', FIREBASE_AUTH_API_KEY: 'fixture', TURNSTILE_SECRET_KEY: 'secret-challenge', TURNSTILE_HOSTNAME: 'app.example.com', SUBMISSION_HMAC_SECRET: 'secret-hmac', NETWORK_HASH_SECRET: 'secret-network' } as Env
  const response = await worker.fetch(new Request('https://api.example.com/v1/registration-requests', {
    method: 'POST', headers: { Origin: 'https://app.example.com', 'Content-Type': 'application/json', 'Idempotency-Key': 'a'.repeat(43) },
    body: JSON.stringify({ fullName: 'Pessoa Fictícia', cpf: '52998224725', whatsapp: '+5568999991234', email: 'fixture@example.com', turnstileToken: 'placeholder' }),
  }), configured)
  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ code: 'DEPENDENCY_UNAVAILABLE', requestId: expect.any(String), dependency: 'TURNSTILE', upstreamStatus: 502 })
})
it('does not expose arbitrary paths or accept untrusted origins', async () => {
  const response = await worker.fetch(new Request('https://api.example.com/v1/firestore/delete', { method: 'POST' }), env)
  expect(response.status).toBe(404)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  const denied = await worker.fetch(new Request('https://api.example.com/v1/registration-requests', { method: 'POST', headers: { Origin: 'https://attacker.example.com' } }), env)
  expect(denied.status).toBe(403)
  expect(await denied.text()).not.toContain('attacker')
})
it('allows only the documented preflight headers for configured origins', async () => {
  const response = await worker.fetch(new Request('https://api.example.com/v1/registration-requests', { method: 'OPTIONS', headers: { Origin: 'https://app.example.com' } }), env)
  expect(response.status).toBe(204)
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com')
})
it('identifies missing configuration names without exposing configured secret values', async () => {
  const response = await worker.fetch(new Request('https://api.example.com/v1/registration-requests', {
    method: 'POST', headers: { Origin: 'https://app.example.com', 'Content-Type': 'application/json' }, body: '{}',
  }), { ...env, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: 'fixture-private-value' } as Env)
  expect(response.status).toBe(503)
  const result = await response.json() as { code: string; missingConfiguration: string[]; requestId: string }
  expect(result.code).toBe('CONFIG_INCOMPLETE')
  expect(result.missingConfiguration).toContain('EXPECTED_PROJECT_ID')
  expect(result.missingConfiguration).not.toContain('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')
  expect(JSON.stringify(result)).not.toContain('fixture-private-value')
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com')
})
