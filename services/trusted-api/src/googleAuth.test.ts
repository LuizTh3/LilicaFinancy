import { afterEach, expect, it, vi } from 'vitest'
import { authCall, identify } from './googleAuth'
import type { Env } from './environment'
afterEach(() => vi.unstubAllGlobals())
it('rejects malformed identity before any privileged lookup', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  await expect(identify(new Request('https://example.com', { headers: { Authorization: 'Bearer forged.invalid.token' } }), { EXPECTED_PROJECT_ID: 'example' } as Env)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
  expect(fetch).not.toHaveBeenCalled()
})
it('does not return sensitive Auth response tokens to its caller', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ localId: 'example', idToken: 'test-only-token', refreshToken: 'test-only-refresh' })))
  const result = await authCall({ FIREBASE_AUTH_API_KEY: 'public-example' } as Env, 'update', { idToken: 'test-only' })
  expect(result).toEqual({ ok: true, uid: 'example', code: undefined })
  expect(JSON.stringify(result)).not.toContain('test-only-token')
})
