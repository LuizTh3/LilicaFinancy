import { ApiError } from './contracts'

export async function trustedApi<T>(path: 'registration-requests' | 'first-login/change-password' | 'first-login/normalize-profile', body: unknown, key?: string, token?: string): Promise<T> {
  const base = import.meta.env.VITE_TRUSTED_API_BASE_URL
  if (!base || !/^https:\/\//.test(base)) throw new ApiError('CONFIG_TRUSTED_API')
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/v1/${path}`, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
    })
    const result = await response.json().catch(() => null)
    if (!result || typeof result !== 'object') throw new ApiError('INVALID_SERVICE_RESPONSE', response.status)
    if (!response.ok) {
      const requestId = typeof result.requestId === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(result.requestId) ? result.requestId : undefined
      throw new ApiError(typeof result.code === 'string' ? result.code : 'DEPENDENCY_UNAVAILABLE', response.status, requestId)
    }
    return result as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError('NETWORK_UNAVAILABLE')
  }
}
