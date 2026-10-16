import { expect, it } from 'vitest'
import { notificationPayload, retryState } from './notifications'

it('builds a fixed minimal notice without applicant data', () => {
  const payload = notificationPayload('noreply@example.com', 'Lilica', 'https://app.example.com', 'abc123', '2026-10-16', 'uuid')
  expect(payload.to).toEqual([{ email: 'luizgustavo.dev01@gmail.com' }])
  expect(payload.textContent).toContain('/admin/solicitacoes/abc123')
  expect(payload.headers.idempotencyKey).toBe('uuid')
})
it('never blindly resends uncertain results after deduplication window', () => {
  expect(retryState(1, 1000, 1000 + 25 * 60000, true)).toBe('uncertain')
  expect(retryState(5, 1000, 2000, false)).toBe('failed')
  expect(retryState(1, 1000, 2000, true)).toBe('retry_wait')
})
