import { expect, it } from 'vitest'
import { configurationError } from './client'
const valid = { VITE_FIREBASE_API_KEY: 'public-example', VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com', VITE_FIREBASE_PROJECT_ID: 'example-project', VITE_FIREBASE_APP_ID: '1:123456:web:abcdef' }
it('identifies each missing field without exposing configured values', () => {
  for (const name of Object.keys(valid)) {
    const message = configurationError({ ...valid, [name]: '' })
    expect(message).toContain(name)
    expect(message).not.toContain('public-example')
  }
  expect(configurationError(valid)).toBe('')
})
it('rejects invalid connection identifiers without echoing them', () => {
  const message = configurationError({ ...valid, VITE_FIREBASE_AUTH_DOMAIN: 'https://private-value.invalid/' })
  expect(message).toContain('VITE_FIREBASE_AUTH_DOMAIN'); expect(message).not.toContain('private-value')
})
