import { expect, it } from 'vitest'
import { integrationEnvironment } from './support/environment'
import { recordFixture } from './support/manifest'
if (!process.env.TEST_TURNSTILE_TOKEN || !process.env.TEST_TURNSTILE_RETRY_TOKEN || !process.env.TEST_TRUSTED_API_BASE_URL || !process.env.TEST_APP_ORIGIN || process.env.TEST_ALLOW_EMAIL !== 'yes') throw new Error('Cadastro real bloqueado: configurar desafios humanos legítimos, API/origem e autorizar até dois avisos')
it('persists a public request and replays without duplicate or public PII', async () => {
  const scope = integrationEnvironment(process.env), key = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
  const id = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))).toString('hex')
  // IDs are derived before request, so a lost response still has a cleanup manifest.
  for (const path of [`registrationRequests/${id}`, `submissionOperations/${id}`, `notificationOutbox/${id}`]) recordFixture(scope, path, scope.uids[0])
  const body = { fullName: 'Pessoa Fictícia ' + scope.runId, cpf: '52998224725', whatsapp: '+5568999991234', email: 'fixture@example.com' }
  const call = (token: string) => fetch(process.env.TEST_TRUSTED_API_BASE_URL! + '/v1/registration-requests', { method: 'POST', headers: { Origin: process.env.TEST_APP_ORIGIN!, 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ ...body, turnstileToken: token }) })
  const response = await call(process.env.TEST_TURNSTILE_TOKEN!)
  expect(response.status).toBe(201)
  const receipt = await response.json()
  expect(receipt.requestId).toBe(id); expect(receipt).not.toHaveProperty('cpf'); expect(receipt).not.toHaveProperty('idToken')
  const replay = await call(process.env.TEST_TURNSTILE_RETRY_TOKEN!)
  expect(replay.status).toBe(200); expect(await replay.json()).toEqual(receipt)
})
