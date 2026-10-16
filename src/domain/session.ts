export type AccessState = 'firstLoginRequired' | 'reloginRequired' | 'ready' | 'error'
export function accessState(profile: { schemaVersion?: unknown; primeiro_login?: unknown; completedAt?: number }, authTime: number): AccessState {
  if (profile.schemaVersion !== 1) return 'error'
  if (profile.primeiro_login === undefined || profile.primeiro_login === true) return 'firstLoginRequired'
  if (profile.primeiro_login !== false || !Number.isFinite(profile.completedAt) || !profile.completedAt) return 'error'
  return authTime * 1000 > profile.completedAt ? 'ready' : 'reloginRequired'
}
export class SessionGeneration {
  private value = 0
  next() { return ++this.value }
  isCurrent(value: number) { return this.value === value }
}
export async function endSession(clear: () => void, signOut: () => Promise<void>, navigate: () => void) {
  clear()
  await signOut()
  navigate()
}
