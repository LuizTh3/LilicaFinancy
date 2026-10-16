import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from 'jose'
import type { Env } from './environment'
import { googleKeys, requireEnv } from './environment'
import { external, HttpError } from './contracts'

const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'))
let oauth: { identity: string; token: string; until: number } | undefined
export async function serviceToken(env: Env) {
  requireEnv(env, googleKeys)
  if (oauth?.identity === env.GOOGLE_SERVICE_ACCOUNT_EMAIL && oauth.until > Date.now()) return oauth.token
  const privateKey = await importPKCS8(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'), 'RS256')
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit' })
    .setProtectedHeader({ alg: 'RS256' }).setIssuer(env.GOOGLE_SERVICE_ACCOUNT_EMAIL)
    .setAudience('https://oauth2.googleapis.com/token').setIssuedAt().setExpirationTime('1h').sign(privateKey)
  const response = await external('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) })
  const data = await response.json() as { access_token?: string; expires_in?: number }
  if (!response.ok || !data.access_token) throw new HttpError('DEPENDENCY_UNAVAILABLE', 503)
  oauth = { identity: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, token: data.access_token, until: Date.now() + Math.max(0, (data.expires_in ?? 3600) - 60) * 1000 }
  return oauth.token
}
export type Identity = { uid: string; email: string; token: string; authTime: number; passwordUpdatedAt: number }
type AuthAccount = { localId: string; email: string; disabled?: boolean; validSince?: string; passwordUpdatedAt?: number; providerUserInfo?: { providerId: string }[] }
export async function lookup(env: Env, uid: string): Promise<AuthAccount> {
  const response = await external(`https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(env.EXPECTED_PROJECT_ID)}/accounts:lookup`, {
    method: 'POST', headers: { Authorization: `Bearer ${await serviceToken(env)}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ localId: [uid] }),
  })
  if (!response.ok) throw new HttpError('DEPENDENCY_UNAVAILABLE', 503)
  const data = await response.json() as { users?: AuthAccount[] }
  const account = data.users?.[0]
  if (!account || account.localId !== uid || account.disabled || !account.providerUserInfo?.some(p => p.providerId === 'password')) throw new HttpError('AUTH_REQUIRED', 401)
  return account
}
export async function identify(request: Request, env: Env): Promise<Identity> {
  const token = request.headers.get('Authorization')?.match(/^Bearer ([^\s]+)$/)?.[1]
  if (!token) throw new HttpError('AUTH_REQUIRED', 401)
  let claims
  try {
    const result = await jwtVerify(token, keys, { algorithms: ['RS256'], audience: env.EXPECTED_PROJECT_ID, issuer: `https://securetoken.google.com/${env.EXPECTED_PROJECT_ID}` })
    claims = result.payload
    const now = Date.now() / 1000
    if (!claims.sub || claims.sub.length > 128 || typeof claims.auth_time !== 'number' || !Number.isInteger(claims.auth_time)
      || typeof claims.iat !== 'number' || typeof claims.exp !== 'number' || claims.exp <= now
      || claims.auth_time > claims.iat || claims.auth_time > now || claims.iat > now) throw new Error()
  } catch { throw new HttpError('AUTH_REQUIRED', 401) }
  const account = await lookup(env, claims.sub!)
  if (claims.auth_time! as number < Number(account.validSince ?? 0)) throw new HttpError('REAUTH_REQUIRED', 401)
  return { uid: account.localId, email: account.email, token, authTime: claims.auth_time as number, passwordUpdatedAt: account.passwordUpdatedAt ?? 0 }
}
export async function authCall(env: Env, action: 'signInWithPassword' | 'update', body: Record<string, unknown>) {
  const response = await external(`https://identitytoolkit.googleapis.com/v1/accounts:${action}?key=${encodeURIComponent(env.FIREBASE_AUTH_API_KEY)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const data = await response.json() as { localId?: string; error?: { message?: string } }
  return { ok: response.ok, uid: data.localId, code: data.error?.message?.split(' : ')[0] }
}
