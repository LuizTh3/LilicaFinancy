import { avancarCompetencia } from '../../domain/finance/calendar'
import { contribuicaoPainelValida, fontesNecessariasPainel, normalizarConsultaPainel, validarSnapshotPainel } from '../../domain/finance/contracts/painel'
import type { ContribuicaoPainel, ConsultaPainel, PaginaPainel } from '../../domain/finance/contracts/painel'
import { camposPermitidos, registro } from '../../domain/finance/errors'
import type { CodigoErro } from '../../domain/finance/errors'
import { registerPrivateFinanceResource } from '../../domain/finance/sessionResources'

export type EstadoPainel = Readonly<{
 estado: 'vazio' | 'carregando' | 'parcial' | 'completo' | 'erro' | 'invalidado'
 visivel?: PaginaPainel; anterior?: PaginaPainel; emConstrucao?: PaginaPainel; codigo?: CodigoErro
}>
export function createPainelState(ctx: { uid: string; generation: number; atual: () => boolean; agora?: () => number }) {
 const now = ctx.agora ?? Date.now
 let id = 0, disposed = false, query: ConsultaPainel | undefined, view: EstadoPainel = Object.freeze({ estado: 'vazio' })
 const unregister = registerPrivateFinanceResource(invalidarSessao)
 function invalidarSessao() { if (disposed) return; disposed = true; unregister(); id++; query = undefined; view = Object.freeze({ estado: 'invalidado' }) }
 const check = () => { if (!ctx.atual()) invalidarSessao(); return !disposed }
 function receber(requestId: number, value: PaginaPainel): boolean {
  if (!check() || requestId !== id || !query) return false
  try {
   if (!registro(value) || !camposPermitidos(value, ['consulta', 'snapshot', 'contribuicoes', 'cobertura', 'completo', 'cursor']) || typeof value.completo !== 'boolean' || !Array.isArray(value.contribuicoes) || value.contribuicoes.length > 50 || !Array.isArray(value.cobertura) || !value.cobertura.length) return false
   const q = normalizarConsultaPainel(value.consulta), t = validarSnapshotPainel(value.snapshot, { uid: ctx.uid, generation: ctx.generation, agora: now() })
   if (!q.ok || !t.ok || JSON.stringify(q.valor) !== JSON.stringify(query) || view.emConstrucao && view.emConstrucao.snapshot.readTime !== t.valor.readTime) return false
   const keys = new Set<string>(), required = fontesNecessariasPainel(query.base), expected: string[] = []
   let month = query.inicio
   while (month <= query.fim) { for (const fonte of required) expected.push(fonte + '/' + month); if (month === query.fim) break; const next = avancarCompetencia(month, 1); if (!next.ok) return false; month = next.valor }
   for (const c of value.cobertura) {
    if (!registro(c) || !camposPermitidos(c, ['fonte', 'competencia', 'fase', 'estado']) || typeof c.fase !== 'string' || c.fase.length > 120 || !['naoIniciada', 'emAndamento', 'completa', 'indisponivel', 'erro'].includes(String(c.estado))) return false
    const key = c.fonte + '/' + c.competencia
    if (!expected.includes(key) || keys.has(key) || value.completo && c.estado !== 'completa') return false
    keys.add(key)
   }
   if (value.completo && expected.some(k => !keys.has(k))) return false
   const rows = new Map<string, ContribuicaoPainel>((view.emConstrucao?.contribuicoes ?? []).map(row => [row.chave, row]))
   for (const row of value.contribuicoes) {
    if (!contribuicaoPainelValida(row, query)) return false
    const old = rows.get(row.chave)
    if (old && JSON.stringify(old) !== JSON.stringify(row)) return false
    rows.set(row.chave, Object.freeze({ ...row, ...(row.etiquetaIds ? { etiquetaIds: Object.freeze([...row.etiquetaIds]) } : {}) }))
   }
   const page = Object.freeze({ ...value, consulta: query, snapshot: t.valor, contribuicoes: Object.freeze([...rows.values()]), cobertura: Object.freeze(value.cobertura.map(c => Object.freeze({ ...c }))) })
   const previous = view.anterior
   if (new TextEncoder().encode(JSON.stringify({ page, previous })).byteLength > 8 * 1024 * 1024) return false
   view = value.completo ? Object.freeze({ estado: 'completo', visivel: page }) : Object.freeze({ estado: 'parcial', emConstrucao: page, ...(previous ? { anterior: previous } : {}) })
   return true
  } catch { return false }
 }
 return {
  iniciar(input: ConsultaPainel) {
   if (!check()) throw Error('SESSAO_PAINEL_INVALIDA')
   const q = normalizarConsultaPainel(input); if (!q.ok) throw Error('CONSULTA_PAINEL_INVALIDA')
   const previous = view.visivel ?? view.anterior
   query = q.valor; id++
   view = Object.freeze({ estado: 'carregando', ...(previous ? { anterior: previous } : {}) })
   return id
  },
  receber,
  falhar(requestId: number, codigo: CodigoErro) {
   if (!check() || requestId !== id) return
   if (codigo === 'semPermissao') { invalidarSessao(); return }
   const previous = view.anterior ?? view.visivel
   view = Object.freeze({ estado: 'erro', codigo, ...(previous ? { anterior: previous } : {}) })
  },
  ler(): EstadoPainel { check(); return view },
  invalidarSessao,
 }
}
