import { Outlet } from 'react-router'
import { useSession } from '../session/useSession'
export function AdminGate() {
  return useSession().status === 'readyAdmin' ? <Outlet /> : <section><h1>Acesso restrito</h1><p>Esta área exige permissão administrativa.</p></section>
}
