import { expect, it } from 'vitest'
if (!process.env.TEST_TRUSTED_API_BASE_URL || !process.env.TEST_APP_ORIGIN) throw new Error('API real bloqueada: configurar URL e origem')
it('rejects forged tokens, arbitrary endpoints and public injection', async () => {
  const base = process.env.TEST_TRUSTED_API_BASE_URL!, headers = { Origin: process.env.TEST_APP_ORIGIN!, 'Content-Type': 'application/json', Authorization: 'Bearer forged.invalid.token', 'Idempotency-Key': 'a'.repeat(43) }
  const auth = await fetch(base + '/v1/first-login/change-password', { method: 'POST', headers, body: JSON.stringify({ newPassword: 'never-used', confirmPassword: 'never-used' }) })
  expect(auth.status).toBe(401)
  const arbitrary = await fetch(base + '/v1/firestore/delete', { method: 'POST', headers, body: '{}' })
  expect(arbitrary.status).toBe(404)
  const injected = await fetch(base + '/v1/registration-requests', { method: 'POST', headers, body: JSON.stringify({ uid: 'other', recipient: 'other@example.com' }) })
  expect(injected.ok).toBe(false)
})
