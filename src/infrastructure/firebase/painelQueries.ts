import { avancarCompetencia } from '../../domain/finance/calendar'
import { contribuicaoPainelValida, fontesNecessariasPainel, normalizarConsultaPainel, validarSnapshotPainel } from '../../domain/finance/contracts/painel'
import type { ContribuicaoPainel, ConsultaPainel, CoberturaPainel, CursorPainel, FontePainel, OrcamentoLeituraPainel, PaginaPainel, PortaPainel, SnapshotPainel } from '../../domain/finance/contracts/painel'
import { camposPermitidos, falha, registro, sucesso, umDe } from '../../domain/finance/errors'
import type { Resultado } from '../../domain/finance/errors'
import type { registrarFontesPainel } from './painelSources'
import { registerPrivateFinanceResource } from '../../domain/finance/sessionResources'
import { createOrcamentoRodada } from './financeiroReadBudget'
export { createOrcamentoRodada } from './financeiroReadBudget'

function abort(code: string): never { throw Object.assign(Error(code), { code }) }
type ContextoPainel = Readonly<{ uid: string; generation: number; atual: () => boolean; agora?: () => number; abrirSnapshot: (budget: OrcamentoLeituraPainel) => Promise<SnapshotPainel> }>
type EstadoFonte = { fonte: FontePainel; posicao?: string; fim: boolean; indisponivel: boolean }
type Scope = { consulta: ConsultaPainel; snapshot: SnapshotPainel; fontes: EstadoFonte[]; next: number; buffer: ContribuicaoPainel[]; vistas: Map<string, string>; ultima?: PaginaPainel; busy: boolean }
function erro(error: unknown): Resultado<never> {
 const code = (error as { code?: string })?.code
 const codigo = code === 'schema' ? 'esquemaIncompativel' : umDe(code, ['semPermissao', 'limiteOperacional', 'valorInvalido', 'conflitoVersao', 'cotaExcedida', 'configuracaoPendente', 'esquemaIncompativel', 'indisponivel', 'integridadeIndeterminada']) ? code : 'integridadeIndeterminada'
 return falha(codigo, 'Não foi possível completar a consulta do painel.', { recuperacao: 'reler' })
}
export function createPainelQueries(ctx: ContextoPainel, registry: ReturnType<typeof registrarFontesPainel>): PortaPainel {
 let disposed = false, abrindo = 0
 const scopes = new Map<CursorPainel, Scope>(), now = ctx.agora ?? Date.now
 const unregister = registerPrivateFinanceResource(invalidarSessao)
 function invalidarSessao() { if (disposed) return; disposed = true; unregister(); scopes.clear(); registry.invalidarSessao() }
 const check = () => { if (disposed || !ctx.atual()) { invalidarSessao(); abort('semPermissao') } }
 function valid(scope: Scope) { check(); if (!validarSnapshotPainel(scope.snapshot, { uid: ctx.uid, generation: ctx.generation, agora: now() }).ok) abort('integridadeIndeterminada') }
 function cobertura(scope: Scope): CoberturaPainel[] {
  const months: string[] = []
  let m = scope.consulta.inicio
  while (m <= scope.consulta.fim) { months.push(m); if (m === scope.consulta.fim) break; const next = avancarCompetencia(m, 1); if (!next.ok) abort('valorInvalido'); m = next.valor }
  return scope.fontes.flatMap(f => months.map(competencia => ({ fonte: f.fonte, competencia, fase: 'dados', estado: f.indisponivel ? 'indisponivel' as const : f.fim && !scope.buffer.length ? 'completa' as const : 'emAndamento' as const })))
 }
 function memory() {
  let bytes = 0
  for (const s of scopes.values()) bytes += new TextEncoder().encode(JSON.stringify({ consulta: s.consulta, snapshot: s.snapshot, fontes: s.fontes, buffer: s.buffer, vistas: [...s.vistas], ultima: s.ultima })).byteLength
  if (bytes > 8 * 1024 * 1024) abort('limiteOperacional')
 }
 async function rodar(handle: CursorPainel, budget: OrcamentoLeituraPainel): Promise<Resultado<PaginaPainel>> {
  const scope = scopes.get(handle)
  if (!scope) return erro({ code: 'valorInvalido' })
  if (scope.busy) return erro({ code: 'conflitoVersao' })
  scope.busy = true
  try {
   valid(scope)
   const output = scope.buffer.splice(0, 50)
   let steps = 0
   while (output.length < 50 && steps < 8 && budget.requisicoes < 8 && budget.disponiveis > 0) {
    const index = scope.fontes.findIndex((_, offset) => { const i = (scope.next + offset) % scope.fontes.length; return !scope.fontes[i].fim && !scope.fontes[i].indisponivel })
    if (index < 0) break
    const at = (scope.next + index) % scope.fontes.length, f = scope.fontes[at]
    const adapter = registry.obter(f.fonte, scope.consulta.base)
    if (!adapter) abort('integridadeIndeterminada')
    steps++
    let page
    try { page = await adapter.paginar({ consulta: scope.consulta, snapshot: scope.snapshot, ...(f.posicao === undefined ? {} : { posicao: f.posicao }), orcamento: budget }) }
    catch (error) { if ((error as { code?: string })?.code === 'limiteOperacional') { scope.next = at; break } throw error }
    valid(scope)
    if (!registro(page) || !camposPermitidos(page, ['contribuicoes', 'completo', 'proxima']) || !Array.isArray(page.contribuicoes) || page.contribuicoes.length > 50 || typeof page.completo !== 'boolean' || (!page.completo && (typeof page.proxima !== 'string' || !page.proxima.length || page.proxima.length > 4096 || page.proxima === f.posicao)) || page.completo && page.proxima !== undefined) abort('integridadeIndeterminada')
    for (const row of page.contribuicoes) {
     if (!contribuicaoPainelValida(row, scope.consulta)) abort('integridadeIndeterminada')
     const canonical = JSON.stringify(row), previous = scope.vistas.get(row.chave)
     if (previous !== undefined && previous !== canonical) abort('integridadeIndeterminada')
     if (previous !== undefined) continue
     scope.vistas.set(row.chave, canonical)
     const line = Object.freeze({ ...row, ...(row.etiquetaIds ? { etiquetaIds: Object.freeze([...row.etiquetaIds]) } : {}) })
     if (output.length < 50) output.push(line); else scope.buffer.push(line)
    }
    f.fim = page.completo; f.posicao = page.proxima; scope.next = (at + 1) % scope.fontes.length
    memory()
   }
   valid(scope)
   const page: PaginaPainel = Object.freeze({ consulta: scope.consulta, snapshot: scope.snapshot, contribuicoes: Object.freeze(output), cobertura: Object.freeze(cobertura(scope)), completo: scope.fontes.every(f => f.fim && !f.indisponivel) && !scope.buffer.length, cursor: handle })
   scope.ultima = page; memory()
   return sucesso(page)
  } catch (error) { scopes.delete(handle); if ((error as { code?: string })?.code === 'semPermissao') invalidarSessao(); return erro(error) } finally { scope.busy = false }
 }
 async function iniciar(input: ConsultaPainel): Promise<Resultado<PaginaPainel>> {
  let handle: CursorPainel | undefined, reservou = false
  try {
   check(); const q = normalizarConsultaPainel(input); if (!q.ok) return q
   if (scopes.size + abrindo >= 2) { const inactive = [...scopes].find(([, s]) => !s.busy); if (!inactive) abort('limiteOperacional'); scopes.delete(inactive[0]) }
   abrindo++; reservou = true
   const budget = createOrcamentoRodada(), raw = await ctx.abrirSnapshot(budget); check()
   const t = validarSnapshotPainel(raw, { uid: ctx.uid, generation: ctx.generation, agora: now() }); if (!t.ok) return t
   handle = crypto.randomUUID() as CursorPainel
   const required = fontesNecessariasPainel(q.valor.base)
   const fontes = required.map(fonte => ({ fonte, fim: false, indisponivel: registry.estado(fonte, q.valor.base) !== 'disponivel' }))
   abrindo--; reservou = false
   scopes.set(handle, { consulta: q.valor, snapshot: t.valor, fontes, next: 0, buffer: [], vistas: new Map(), busy: false })
   return await rodar(handle, budget)
  } catch (error) { if (handle) scopes.delete(handle); return erro(error) } finally { if (reservou) abrindo-- }
 }
 return {
  iniciar, atualizar: iniciar,
  async continuar(handle) {
   try { check(); const scope = scopes.get(handle); if (!scope || scope.fontes.every(f => f.fim || f.indisponivel) && !scope.buffer.length) abort('valorInvalido'); valid(scope); return await rodar(handle, createOrcamentoRodada()) } catch (error) { return erro(error) }
  },
  async detalhar(handle) {
   try { const scope = scopes.get(handle); if (!scope?.ultima) abort('valorInvalido'); valid(scope); return sucesso(scope.ultima) } catch (error) { return erro(error) }
  },
  invalidarSessao,
 }
}
