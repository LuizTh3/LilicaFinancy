import { expect, it } from 'vitest'
import worker from './index'
import type { Env } from './environment'
const env = { ALLOWED_ORIGINS: 'https://app.example.com' } as Env
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
