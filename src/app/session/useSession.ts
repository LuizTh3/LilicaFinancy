import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'
export type SessionStatus = 'resolvingAuth' | 'resolvingProfile' | 'resolvingRole' | 'guest' | 'firstLoginRequired' | 'reloginRequired' | 'readyUser' | 'readyAdmin' | 'logoutPending' | 'error'
export type SessionState = { status: SessionStatus; user: User | null; message?: string; timezone?: string; generation?: number }
export type Session = SessionState & { retry: () => void; exit: () => Promise<void>; invalidate: () => void; isCurrent?: (generation: number) => boolean }
export const SessionContext = createContext<Session | null>(null)
export function useSession() { const session = useContext(SessionContext); if (!session) throw new Error('SESSION_CONTEXT'); return session }
