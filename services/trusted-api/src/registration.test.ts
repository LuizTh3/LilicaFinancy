import { expect, it } from 'vitest'
import { operationKey, jsonBody } from './contracts'
import { hmac, checkChallenge } from './registration'

it('requires strong operation keys', () => {
  expect(() => operationKey(new Request('https://example.com'))).toThrow()
  expect(operationKey(new Request('https://example.com', { headers: { 'Idempotency-Key': 'a'.repeat(43) } }))).toHaveLength(43)
})
it('caps streaming input and rejects invalid JSON', async () => {
  await expect(jsonBody(new Request('https://example.com', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'a'.repeat(8193) }))).rejects.toMatchObject({ code: 'BODY_TOO_LARGE' })
})
it('checks hostname/action, not merely success', () => {
  expect(() => checkChallenge({ success: true, hostname: 'other', action: 'registration' }, 'app.example.com')).toThrow()
  expect(() => checkChallenge({ success: true, hostname: 'app.example.com', action: 'registration' }, 'app.example.com')).not.toThrow()
})
it('fingerprints payloads with a server secret', async () => {
  expect(await hmac('one', 'payload')).not.toBe(await hmac('two', 'payload'))
})
