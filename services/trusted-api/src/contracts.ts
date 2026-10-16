export class HttpError extends Error {
  constructor(public readonly code: string, public readonly status: number = 400) { super(code) }
}
export function operationKey(request: Request) {
  const key = request.headers.get('Idempotency-Key') ?? ''
  if (!/^[A-Za-z0-9_-]{43}$/.test(key)) throw new HttpError('INVALID_INPUT')
  return key
}
export async function external(url: string, init?: RequestInit) {
  try { return await fetch(url, { ...init, signal: AbortSignal.timeout(10000) }) }
  catch { throw new HttpError('DEPENDENCY_UNAVAILABLE', 503) }
}
export async function jsonBody(request: Request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new HttpError('INVALID_INPUT')
  const reader = request.body?.getReader()
  if (!reader) throw new HttpError('INVALID_INPUT')
  let length = 0
  const chunks: Uint8Array[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.byteLength
    if (length > 8192) { await reader.cancel(); throw new HttpError('BODY_TOO_LARGE', 413) }
    chunks.push(value)
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  try { return JSON.parse(new TextDecoder().decode(bytes)) as unknown } catch { throw new HttpError('INVALID_INPUT') }
}
