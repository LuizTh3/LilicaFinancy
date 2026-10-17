import type { Env } from './environment'
import { serviceToken } from './googleAuth'
import { DependencyError, external, HttpError } from './contracts'

export type Data = Record<string, unknown>
type Value = { nullValue?: null; stringValue?: string; booleanValue?: boolean; integerValue?: string; doubleValue?: number; timestampValue?: string; mapValue?: { fields: Record<string, Value> } }
export class Stamp { constructor(public readonly iso: string) {} }
export const stamp = (ms: number) => new Stamp(new Date(ms).toISOString())
export function milliseconds(value: unknown): number { return value instanceof Stamp ? Date.parse(value.iso) : NaN }
function encode(value: unknown): Value {
  if (value === null) return { nullValue: null }
  if (value instanceof Stamp) return { timestampValue: value.iso }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  if (value && typeof value === 'object') return { mapValue: { fields: fields(value as Data) } }
  throw new HttpError('INTERNAL_DATA', 503)
}
function fields(data: Data): Record<string, Value> { return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encode(value)])) }
function decode(value: Value): unknown {
  if ('timestampValue' in value) return new Stamp(value.timestampValue!)
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) return value.booleanValue
  if ('mapValue' in value) return unpack(value.mapValue?.fields ?? {})
  return null
}
function unpack(data: Record<string, Value>): Data { return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, decode(value)])) }
const allowed = new Set(['users', 'firstLoginOperations', 'operationBudgets', 'registrationRequests', 'submissionOperations', 'notificationOutbox'])
export class Store {
  private readonly base: string
  constructor(private readonly env: Env) { this.base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.EXPECTED_PROJECT_ID)}/databases/(default)/documents` }
  name(path: string) {
    const [collection, id, extra] = path.split('/')
    if (!allowed.has(collection) || !id || extra !== undefined || [...id].some(char => char.charCodeAt(0) < 32)) throw new HttpError('FORBIDDEN', 403)
    return this.base.slice('https://firestore.googleapis.com/v1/'.length) + '/' + path
  }
  async call(suffix: string, body?: unknown) {
    const response = await external(this.base + suffix, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${await serviceToken(this.env)}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }, 'FIRESTORE')
    if (response.status === 404 && body === undefined) return null
    if (response.status === 409) throw new HttpError('TRANSACTION_RETRY', 409)
    if (!response.ok) throw new DependencyError('FIRESTORE', response.status)
    return await response.json().catch(() => { throw new DependencyError('FIRESTORE', response.status) }) as Record<string, unknown>
  }
  async get(path: string, transaction?: string): Promise<Data | null> {
    const name = this.name(path)
    const document = await this.call('/' + name.split('/documents/')[1].split('/').map(encodeURIComponent).join('/') + (transaction ? `?transaction=${encodeURIComponent(transaction)}` : ''))
    return document ? unpack(document.fields as Record<string, Value> ?? {}) : null
  }
  async atomic<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const start = await this.call(':beginTransaction', { options: { readWrite: {} } })
      const transaction = start?.transaction as string
      if (!transaction) throw new DependencyError('FIRESTORE')
      const tx = new Transaction(this, transaction)
      try {
        const value = await work(tx)
        await this.call(':commit', { transaction, writes: tx.writes })
        return value
      } catch (error) {
        try { await this.call(':rollback', { transaction }) } catch { /* no sensitive diagnostics */ }
        if (error instanceof HttpError && error.code === 'TRANSACTION_RETRY') {
          if (attempt < 2) continue
          throw new HttpError('OPERATION_BUSY', 409)
        }
        throw error
      }
    }
    throw new HttpError('OPERATION_BUSY', 409)
  }
  async due(status: string, field: 'nextAttemptAt' | 'leaseUntil', now: number, limit: number): Promise<string[]> {
    const result = await this.call(':runQuery', { structuredQuery: { from: [{ collectionId: 'notificationOutbox' }], where: { compositeFilter: { op: 'AND', filters: [
      { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: status } } },
      { fieldFilter: { field: { fieldPath: field }, op: 'LESS_THAN_OR_EQUAL', value: { timestampValue: new Date(now).toISOString() } } },
    ] } }, orderBy: [{ field: { fieldPath: field }, direction: 'ASCENDING' }], limit } })
    return ((result ?? []) as unknown as { document?: { name: string } }[]).flatMap(row => row.document ? [row.document.name.split('/').at(-1)!] : [])
  }
}
export class Transaction {
  readonly writes: unknown[] = []
  constructor(private readonly store: Store, private readonly transaction: string) {}
  get(path: string) { if (this.writes.length) throw new HttpError('READ_AFTER_WRITE', 503); return this.store.get(path, this.transaction) }
  put(path: string, data: Data, serverFields: string[] = []) {
    this.writes.push({ update: { name: this.store.name(path), fields: fields(data) }, ...(serverFields.length ? { updateTransforms: serverFields.map(fieldPath => ({ fieldPath, setToServerValue: 'REQUEST_TIME' })) } : {}) })
  }
}
