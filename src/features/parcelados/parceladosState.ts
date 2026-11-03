import type { ConfirmacaoParcelada, DescritorParcelado, PortaParcelados, PreviaCriacaoParcelada } from '../../domain/finance/contracts/parcelados'
import { falha, sucesso } from '../../domain/finance/errors'
import type { CodigoErro, Resultado } from '../../domain/finance/errors'
import { prepararCriacao } from '../../domain/finance/parcelados'
import { normalizarCriacaoParcelada } from '../../domain/finance/parceladosCommands'
import { registerPrivateFinanceResource } from '../../domain/finance/sessionResources'

type EstadoParcelado = Readonly<{ estado: 'entrada' | 'previa' | 'enviando' | 'confirmada' | 'indeterminada' | 'erro' | 'invalidada'; previa?: PreviaCriacaoParcelada; descritor?: DescritorParcelado; resultado?: ConfirmacaoParcelada; codigo?: CodigoErro }>
export function createParceladosState(ctx: { uid: string; generation: number; atual: () => boolean }, porta: PortaParcelados) {
  let estado: EstadoParcelado = Object.freeze({ estado: 'entrada' }), entrada: unknown, conferencia: string | undefined, epoch = 0, disposed = false, busy = false
  const listeners = new Set<() => void>()
  function publicar(next: EstadoParcelado) { estado = Object.freeze(next); for (const listener of [...listeners]) { try { listener() } catch { /* One subscriber cannot prevent private-state invalidation. */ } } }
  const unregister = registerPrivateFinanceResource(invalidarSessao)
  function invalidarSessao() { if (disposed) return; disposed = true; epoch++; entrada = undefined; conferencia = undefined; publicar({ estado: 'invalidada' }); listeners.clear(); unregister() }
  const check = () => { if (!ctx.uid || !ctx.atual()) invalidarSessao(); return !disposed }
  function limpar() { epoch++; entrada = undefined; conferencia = undefined; publicar({ estado: 'entrada' }) }
  return {
    estado() { check(); return estado }, invalidarSessao,
    assinar(listener: () => void) { if (!check()) return () => {}; listeners.add(listener); return () => { listeners.delete(listener) } },
    preparar(input: unknown, descritor: DescritorParcelado): Resultado<PreviaCriacaoParcelada> {
      if (!check()) return falha('semPermissao', 'A sessão mudou.')
      if (busy || estado.estado === 'indeterminada') return falha('confirmacaoIndeterminada', 'Consulte a tentativa anterior antes de alterar a intenção.')
      const c = normalizarCriacaoParcelada({ descritor, entrada: input })
      if (!c.ok) return c
      const previa = prepararCriacao(input, `criarSerie__${descritor.operationKey}`)
      if (!previa.ok) return previa
      entrada = JSON.parse(JSON.stringify(input)); conferencia = c.valor.conferencia; epoch++
      publicar({ estado: 'previa', previa: previa.valor, descritor: c.valor.descritor })
      return sucesso(previa.valor)
    },
    alterar() { if (!check() || busy || estado.estado === 'indeterminada') return false; limpar(); return true },
    abandonar() { if (!check() || busy || estado.estado === 'indeterminada') return false; limpar(); return true },
    async enviar(): Promise<boolean> {
      if (!check() || busy || !['previa', 'indeterminada', 'erro'].includes(estado.estado) || !estado.descritor || !conferencia || !entrada) return false
      const atual = epoch, d = estado.descritor, previa = estado.previa
      busy = true; publicar({ estado: 'enviando', descritor: d, previa })
      try {
        const r = await porta.criarSerie({ descritor: d, entrada, conferencia })
        if (!check() || atual !== epoch) return false
        if (r.ok) { entrada = undefined; conferencia = undefined; publicar({ estado: 'confirmada', resultado: r.valor }); return true }
        if (r.erro.codigo === 'semPermissao') { invalidarSessao(); return false }
        publicar({ estado: ['confirmacaoIndeterminada', 'indisponivel'].includes(r.erro.codigo) ? 'indeterminada' : 'erro', descritor: d, previa, codigo: r.erro.codigo })
        return false
      } catch {
        if (check() && atual === epoch) publicar({ estado: 'indeterminada', descritor: d, previa, codigo: 'confirmacaoIndeterminada' })
        return false
      } finally { busy = false }
    },
    async consultar(): Promise<boolean> {
      if (!check() || busy || !estado.descritor) return false
      const atual = epoch, d = estado.descritor
      busy = true
      try {
        const r = await porta.consultarOperacao(d)
        if (!check() || atual !== epoch) return false
        if (r.ok && r.valor.estado === 'confirmado') { entrada = undefined; conferencia = undefined; publicar({ estado: 'confirmada', resultado: r.valor }); return true }
        if (!r.ok && r.erro.codigo === 'semPermissao') invalidarSessao()
        // An absent read cannot prove that an older request will never commit.
        // Keep the same intention; never manufacture a fresh operation key.
        return false
      } catch { return false } finally { busy = false }
    },
  }
}
