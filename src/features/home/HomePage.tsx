import { Link } from 'react-router'
export function HomePage() {
  return (
    <section aria-labelledby="home-title">
      <p className="eyebrow">Seu espaço financeiro</p>
      <h1 id="home-title">Um começo organizado.</h1>
      <p className="intro">
        Entre com sua conta ou solicite acesso ao responsável.
      </p>
      <div className="setup-notice">
        <span className="notice-label">Acesso ao aplicativo</span>
        <h2>Seu espaço privado</h2>
        <p>
          Use a conta fornecida pelo responsável. No primeiro acesso, você deverá
          escolher uma nova senha antes de iniciar.
        </p>
      </div>
      <div className="actions"><Link className="nav-link" to="/login">Entrar</Link><Link to="/cadastro">Solicitar cadastro</Link></div>
      <p className="scope-note">
        Os recursos de controle financeiro serão disponibilizados nas próximas
        etapas do aplicativo.
      </p>
    </section>
  )
}
