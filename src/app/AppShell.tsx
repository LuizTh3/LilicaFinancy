import type { ReactNode } from 'react'
import { SkipLink } from '../shared/components/SkipLink'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <header className="app-header">
        <div className="header-inner">
          <span className="brand">Lilica<span>Financy</span></span>
          <nav aria-label="Navegação principal">
            <a className="nav-link" href="/" aria-current="page">Início</a>
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
