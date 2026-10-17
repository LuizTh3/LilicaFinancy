import { expect, it } from 'vitest'
import { errorMessage } from './errorMessage'
it('distinguishes server configuration from network failure without showing raw errors', () => {
  const configuration = errorMessage({ code: 'CONFIG_INCOMPLETE', message: 'fixture-private-value' })
  expect(configuration).toContain('configuração')
  expect(configuration).not.toBe(errorMessage({ code: 'NETWORK_UNAVAILABLE' }))
  expect(configuration).not.toContain('fixture-private-value')
})
