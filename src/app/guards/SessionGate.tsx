import { Navigate, Outlet } from 'react-router'
import { useSession } from '../session/useSession'

export function SessionFeedback() {
  const session = useSession()
  if (session.status === 'error') return <section><h1>Acesso indisponível</h1><p role="alert">{session.message ?? 'Não foi possível confirmar a sessão.'}</p><button onClick={session.retry}>Tentar novamente</button><button onClick={() => { void session.exit().catch(() => {}) }}>Sair</button></section>
  return <output>Confirmando sua sessão…</output>
}
export function SessionGate() {
  const { status } = useSession()
  if (status === 'guest' || status === 'reloginRequired') return <Navigate to="/login" replace />
  if (status === 'firstLoginRequired') return <Navigate to="/primeiro-acesso" replace />
  return status === 'readyUser' || status === 'readyAdmin' ? <Outlet /> : <SessionFeedback />
}
