export function SkipLink() {
  return (
    <a
      className="skip-link"
      href="#conteudo-principal"
      onClick={() => document.getElementById('conteudo-principal')?.focus()}
    >
      Ir para o conteúdo
    </a>
  )
}
