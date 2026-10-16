import type { Env } from './environment'
import { requireEnv, googleKeys } from './environment'
import { HttpError, jsonBody, operationKey } from './contracts'
import { identify } from './googleAuth'
import { Store } from './firestoreRest'
import { changePassword, normalizeProfile } from './firstLogin'
import { register } from './registration'
import { notificationCron } from './notifications'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID()
    const origin = request.headers.get('Origin') ?? ''
    const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map(value => value.trim()).includes(origin) && !!origin
    const headers: Record<string, string> = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json', Vary: 'Origin', ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}) }
    const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
    try {
      if (request.method === 'OPTIONS') {
        if (!allowed) throw new HttpError('FORBIDDEN', 403)
        return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key', 'Access-Control-Max-Age': '600' } })
      }
      const path = new URL(request.url).pathname
      if (request.method !== 'POST' || !['/v1/registration-requests', '/v1/first-login/change-password', '/v1/first-login/normalize-profile'].includes(path)) throw new HttpError('NOT_FOUND', 404)
      if (!allowed) throw new HttpError('FORBIDDEN', 403)
      requireEnv(env, googleKeys)
      const body = await jsonBody(request)
      const store = new Store(env)
      if (path === '/v1/registration-requests') {
        const result = await register(env, store, operationKey(request), body, request.headers.get('CF-Connecting-IP') ?? 'unknown')
        return reply(result.receipt, result.repeated ? 200 : 201)
      }
      const identity = await identify(request, env)
      if (path === '/v1/first-login/normalize-profile') {
        if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length) throw new HttpError('INVALID_INPUT')
        return reply(await normalizeProfile(store, identity))
      }
      return reply(await changePassword(env, store, identity, operationKey(request), body))
    } catch (error) {
      return reply({ code: error instanceof HttpError ? error.code : 'DEPENDENCY_UNAVAILABLE', requestId }, error instanceof HttpError ? error.status : 503)
    }
  },
  async scheduled(_controller: ScheduledController, env: Env) { await notificationCron(env) },
}
