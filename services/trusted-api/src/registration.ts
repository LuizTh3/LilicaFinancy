import { exactKeys, parseRegistration } from '../../../src/domain/registration'
import type { Env } from './environment'
import { requireEnv } from './environment'
import { DependencyError, external, HttpError } from './contracts'
import { Store, stamp } from './firestoreRest'

function hex(bytes: ArrayBuffer) { return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('') }
export async function digest(value: string) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))) }
export async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))
}
export function checkChallenge(result: unknown, hostname: string) {
  if (!result || typeof result !== 'object' || !('success' in result) || !('hostname' in result) || !('action' in result)) throw new HttpError('CHALLENGE_REQUIRED', 400)
  if (!result.success || result.hostname !== hostname || result.action !== 'registration') throw new HttpError('CHALLENGE_REQUIRED', 400)
}
export async function register(env: Env, store: Store, key: string, input: unknown, network: string) {
  requireEnv(env, ['TURNSTILE_SECRET_KEY', 'TURNSTILE_HOSTNAME', 'SUBMISSION_HMAC_SECRET', 'NETWORK_HASH_SECRET'])
  try { exactKeys(input, ['fullName', 'cpf', 'whatsapp', 'email', 'turnstileToken']) } catch { throw new HttpError('INVALID_INPUT') }
  const { turnstileToken, ...data } = input
  if (typeof turnstileToken !== 'string' || !turnstileToken || turnstileToken.length > 2048) throw new HttpError('CHALLENGE_REQUIRED')
  let parsed
  try { parsed = parseRegistration(data) } catch { throw new HttpError('INVALID_INPUT') }
  const challenge = await external('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: turnstileToken }) }, 'TURNSTILE')
  const result: unknown = await challenge.json().catch(() => { throw new DependencyError('TURNSTILE', challenge.status) })
  const knownCodes = new Set(['missing-input-secret', 'invalid-input-secret', 'missing-input-response', 'invalid-input-response', 'bad-request', 'timeout-or-duplicate', 'internal-error'])
  const codes = result && typeof result === 'object' && 'error-codes' in result && Array.isArray(result['error-codes'])
    ? [...new Set(result['error-codes'].filter((code): code is string => typeof code === 'string' && knownCodes.has(code)))] : []
  if (!challenge.ok || codes.some(code => ['missing-input-secret', 'invalid-input-secret', 'bad-request', 'internal-error'].includes(code))) throw new DependencyError('TURNSTILE', challenge.status, codes)
  checkChallenge(result, env.TURNSTILE_HOSTNAME)
  const id = await digest(key)
  const fingerprint = await hmac(env.SUBMISSION_HMAC_SECRET, JSON.stringify(parsed))
  const now = Date.now(), hour = Math.floor(now / 3600000), day = Math.floor(now / 86400000)
  const net = await hmac(env.NETWORK_HASH_SECRET, `${hour}:${network}`)
  const repeated = await store.atomic(async tx => {
    const op = await tx.get(`submissionOperations/${id}`)
    if (op) {
      if (op.payloadFingerprint !== fingerprint) throw new HttpError('OPERATION_CONFLICT', 409)
      return true
    }
    const networkPath = `operationBudgets/network-${net}`
    const globalPath = `operationBudgets/global-${day}`
    const netBudget = await tx.get(networkPath), globalBudget = await tx.get(globalPath)
    if (Number(netBudget?.count ?? 0) >= 20 || Number(globalBudget?.count ?? 0) >= 100) throw new HttpError('RATE_LIMITED', 429)
    tx.put(networkPath, { count: Number(netBudget?.count ?? 0) + 1, windowStart: stamp(hour * 3600000), expiresAt: stamp((hour + 1) * 3600000) })
    tx.put(globalPath, { count: Number(globalBudget?.count ?? 0) + 1, windowStart: stamp(day * 86400000), expiresAt: stamp((day + 1) * 86400000) })
    tx.put(`registrationRequests/${id}`, { ...parsed, applicantUid: null, status: 'received', schemaVersion: 1 }, ['createdAt', 'updatedAt'])
    tx.put(`submissionOperations/${id}`, { requestId: id, payloadFingerprint: fingerprint, schemaVersion: 1 }, ['createdAt'])
    tx.put(`notificationOutbox/${id}`, { requestId: id, schemaVersion: 1, deliveryKey: crypto.randomUUID(), templateVersion: 1, status: 'pending', attempts: 0, nextAttemptAt: stamp(now) }, ['createdAt', 'updatedAt'])
    return false
  })
  return { repeated, receipt: { requestId: id, status: 'received', notificationStatus: 'pending' } }
}
