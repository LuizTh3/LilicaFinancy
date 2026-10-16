import type { Env } from './environment'
import { requireEnv } from './environment'
import { external } from './contracts'
import { Store, milliseconds, stamp } from './firestoreRest'

export function notificationPayload(sender: string, name: string, base: string, id: string, created: string, key: string) {
  return { sender: { email: sender, name }, to: [{ email: 'luizgustavo.dev01@gmail.com' }], subject: 'Nova solicitação de acesso — LilicaFinancy', textContent: `Solicitação ${id}\nRecebida em ${created}\nConsultar: ${base.replace(/\/$/, '')}/admin/solicitacoes/${encodeURIComponent(id)}`, headers: { idempotencyKey: key } }
}
export function retryState(attempts: number, firstDispatch: number, now: number, uncertain: boolean) {
  if (uncertain && now - firstDispatch >= 25 * 60000) return 'uncertain'
  if (attempts >= 5) return uncertain ? 'uncertain' : 'failed'
  return 'retry_wait'
}
export async function deliver(env: Env, store: Store, id: string) {
  const path = `notificationOutbox/${id}`, leaseId = crypto.randomUUID()
  const task = await store.atomic(async tx => {
    const item = await tx.get(path)
    if (!item || !['pending', 'retry_wait', 'sending'].includes(String(item.status))) return null
    const now = Date.now()
    if (item.status === 'sending' && milliseconds(item.leaseUntil) > now) return null
    if (item.status !== 'sending' && milliseconds(item.nextAttemptAt) > now) return null
    const uncertain = item.status === 'sending' || item.uncertainDelivery === true
    const first = Number.isFinite(milliseconds(item.firstDispatchAt)) ? milliseconds(item.firstDispatchAt) : now
    const attempts = Number(item.attempts)
    const state = retryState(attempts, first, now, uncertain)
    if (state !== 'retry_wait') { tx.put(path, { ...item, status: state }, ['updatedAt']); return null }
    const payload = item.payload ?? notificationPayload(env.BREVO_SENDER_EMAIL, env.BREVO_SENDER_NAME, env.APP_BASE_URL, id, item.createdAt instanceof Object ? new Date(milliseconds(item.createdAt)).toISOString() : '', String(item.deliveryKey))
    const next = { ...item, payload, status: 'sending', attempts: attempts + 1, leaseId, leaseUntil: stamp(now + 60000), firstDispatchAt: stamp(first), uncertainDelivery: uncertain }
    tx.put(path, next, ['updatedAt'])
    return next
  })
  if (!task) return
  let status = 'retry_wait', error = '', providerMessageId: string | undefined, uncertain = task.uncertainDelivery
  try {
    const response = await external('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(task.payload) })
    const result = await response.json() as { messageId?: string; code?: string }
    if (response.ok && typeof result.messageId === 'string' && result.messageId.length <= 512) { status = 'accepted'; providerMessageId = result.messageId; uncertain = false }
    else if (result.code === 'duplicate_parameter') { status = 'accepted_deduplicated'; uncertain = false }
    else if (response.status >= 500 || response.ok) { uncertain = true; error = 'PROVIDER_UNCERTAIN' }
    else { error = response.status === 429 ? 'PROVIDER_QUOTA' : 'PROVIDER_REJECTED' }
  } catch { uncertain = true; error = 'PROVIDER_UNCERTAIN' }
  if (status === 'retry_wait') status = retryState(task.attempts, milliseconds(task.firstDispatchAt), Date.now(), uncertain)
  await store.atomic(async tx => {
    const current = await tx.get(path)
    if (!current || current.leaseId !== leaseId || current.status !== 'sending') return
    tx.put(path, { ...current, status, uncertainDelivery: uncertain, lastErrorCode: error, nextAttemptAt: stamp(Date.now() + 60000 * 2 ** Math.min(task.attempts, 4)), ...(providerMessageId ? { providerMessageId } : {}) }, ['updatedAt'])
  })
}
export async function notificationCron(env: Env) {
  requireEnv(env, ['BREVO_API_KEY', 'BREVO_SENDER_EMAIL', 'BREVO_SENDER_NAME', 'APP_BASE_URL'])
  if (!/^https:\/\//.test(env.APP_BASE_URL)) throw new Error('CONFIG_INCOMPLETE')
  const store = new Store(env), now = Date.now()
  const ids: string[] = []
  for (const status of ['pending', 'retry_wait', 'sending']) {
    if (ids.length >= 5) break
    ids.push(...await store.due(status, status === 'sending' ? 'leaseUntil' : 'nextAttemptAt', now, 5 - ids.length))
  }
  for (const id of ids) { try { await deliver(env, store, id) } catch { /* durable lease retries on a later cron */ } }
}
