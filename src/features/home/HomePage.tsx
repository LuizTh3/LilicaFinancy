export function HomePage() {
  return (
    <section aria-labelledby="home-title">
      <p className="eyebrow">Seu espaço financeiro</p>
      <h1 id="home-title">Um começo organizado.</h1>
      <p className="intro">
        A base do LilicaFinancy está pronta para as próximas etapas.
      </p>
      <div className="setup-notice">
        <span className="notice-label">Próxima etapa</span>
        <h2>Configuração do Firebase</h2>
        <p>
          A configuração Firebase ocorrerá na próxima etapa. Você não precisa
          informar nenhum dado de acesso agora.
        </p>
      </div>
      <p className="scope-note">
        Os recursos de controle financeiro serão disponibilizados nas próximas
        etapas do aplicativo.
      </p>
    </section>
  )
}
