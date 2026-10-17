export type Receipt = { requestId: string; status: 'received'; notificationStatus: 'pending' }
export type PasswordReceipt = { status: 'completed'; reloginRequired: true; loginAvailableAt: number }
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly requestId?: string
  constructor(code: string, status = 503, requestId?: string) { super(code); this.code = code; this.status = status; this.requestId = requestId }
}
export function operationId() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
