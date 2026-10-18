import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { firebase, configurationError } from '../../infrastructure/firebase/client'
import { observeAuth, logout } from '../../infrastructure/firebase/auth'
import { loadProfile } from '../../infrastructure/firebase/profileRepository'
import { accessState, endSession, SessionGeneration } from '../../domain/session'
import { financeTimezone, clearPrivateIntents } from './financeSession'

import { SessionContext } from './useSession'
import type { SessionState } from './useSession'
function clearCadastroIntent(){try{clearPrivateIntents(sessionStorage)}catch{/* Storage unavailable. */}}
export function SessionProvider({ children }: { children: ReactNode }) {
  const initialError = configurationError(import.meta.env)
  const [state, setState] = useState<SessionState>({ status: initialError ? 'error' : 'resolvingAuth', user: null, message: initialError })
  const [retryCount, retry] = useState(0)
  const generation = useRef(new SessionGeneration())
  const listeners = useRef<(() => void)[]>([])
  const lastUid = useRef<string | null>(null)
  const leaving = useRef(false)
  const clear = useCallback(() => { generation.current.next(); listeners.current.splice(0).forEach(stop => stop()) }, [])
  const invalidate = useCallback(() => { clearCadastroIntent(); clear(); setState({ status: 'error', user: null, message: 'Acesso indisponível. Resolva a sessão novamente.' }) }, [clear])
  const exit = useCallback(async () => {
    clearCadastroIntent()
    leaving.current = true
    try { await endSession(() => { clear(); setState({ status: 'logoutPending', user: null }) }, logout, () => location.replace('/login')) }
    catch { setState({ status: 'error', user: null, message: 'Não foi possível encerrar a sessão. Tente sair novamente.' }); throw new Error('LOGOUT_FAILED') }
  }, [clear])
  useEffect(() => {
    if (initialError) return
    leaving.current = false
    // Clear authorization while resubscribing to the external Auth observer.
    // eslint-disable-next-line react/set-state-in-effect
    setState({ status: 'resolvingAuth', user: null })
    let stopAuth: (() => void) | undefined
    try {
      stopAuth = observeAuth(user => {
        if (leaving.current) return
        const previous = lastUid.current
        clear()
        if (previous && user?.uid !== previous) {
          clearCadastroIntent()
          setState({ status: 'resolvingAuth', user: null })
          location.replace(user ? '/app' : '/login')
          return
        }
        lastUid.current = user?.uid ?? null
        const current = generation.current.next()
        if (!user) { clearCadastroIntent(); setState({ status: 'guest', user: null }); return }
        setState({ status: 'resolvingProfile', user: null })
        void (async () => {
          const profile = await loadProfile(user)
          const result = await user.getIdTokenResult()
          if (!generation.current.isCurrent(current)) return
          const access = accessState(profile, Number(result.claims.auth_time))
          if (access === 'error') throw new Error('PROFILE_INTEGRITY')
          if (access !== 'ready') { clearCadastroIntent(); setState({ status: access, user }); return }
          const timezone = financeTimezone(profile.timezone)
          setState({ status: 'resolvingRole', user: null })
          const { db } = firebase()
          const roleStop = onSnapshot(doc(db, 'admins', user.uid), { includeMetadataChanges: true }, snapshot => {
            if (!generation.current.isCurrent(current) || snapshot.metadata.fromCache) return
            setState({ status: snapshot.data()?.enabled === true ? 'readyAdmin' : 'readyUser', user, timezone, generation: current })
          }, () => { if (generation.current.isCurrent(current)) invalidate() })
          const profileStop = onSnapshot(doc(db, 'users', user.uid), { includeMetadataChanges: true }, snapshot => {
            if (!generation.current.isCurrent(current) || snapshot.metadata.fromCache) return
            const data = snapshot.data()
            const next = accessState({ schemaVersion: data?.schemaVersion, primeiro_login: data?.primeiro_login, completedAt: data?.passwordChangeCompletedAt?.toMillis?.() }, Number(result.claims.auth_time))
            if (next !== 'ready' || data?.timezone !== timezone) { clearCadastroIntent(); clear(); setState({ status: next === 'ready' || next === 'error' ? 'error' : next, user: next === 'ready' || next === 'error' ? null : user }) }
          }, () => { if (generation.current.isCurrent(current)) invalidate() })
          listeners.current.push(roleStop, profileStop)
        })().catch(() => { if (generation.current.isCurrent(current)) { clearCadastroIntent(); clear(); setState({ status: 'error', user: null, message: 'Não foi possível confirmar o perfil e as permissões. Verifique a conexão e tente novamente.' }) } })
      })
    } catch { setState({ status: 'error', user: null, message: 'Falha ao iniciar a autenticação.' }) }
    return () => { stopAuth?.(); clear() }
  }, [retryCount, initialError, clear, invalidate])
  return <SessionContext.Provider value={{ ...state, exit, invalidate, isCurrent: value => generation.current.isCurrent(value), retry: () => retry(value => value + 1) }}>{children}</SessionContext.Provider>
}
