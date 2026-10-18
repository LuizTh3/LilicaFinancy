import type { ReactNode } from 'react'
import { SkipLink } from '../shared/components/SkipLink'
import { NavLink } from 'react-router'
import { useSession } from './session/useSession'

export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession()
  const ready = session.status === 'readyUser' || session.status === 'readyAdmin'
  return (
    <>
      <SkipLink />
      <header className="app-header">
        <div className="header-inner">
          <span className="brand">Lilica<span>Financy</span></span>
          <nav aria-label="Navegação principal">
            <NavLink className="nav-link" to="/">Início</NavLink>
            {ready ? <NavLink className="nav-link" to="/app">Minha área</NavLink> : <NavLink className="nav-link" to="/login">Entrar</NavLink>}
            {ready && <NavLink className="nav-link" to="/app/cadastros">Cadastros</NavLink>}
            {ready && <NavLink className="nav-link" to="/app/lancamentos">Receitas e despesas</NavLink>}
            {session.status === 'readyAdmin' && <NavLink className="nav-link" to="/admin/solicitacoes">Solicitações</NavLink>}
            {session.user && <button onClick={() => { void session.exit().catch(() => {}) }}>Sair</button>}
          </nav>
        </div>
      </header>
      <main id="conteudo-principal" className="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="app-footer">LilicaFinancy · Controle financeiro pessoal</footer>
    </>
  )
}
