import { avancarCompetencia } from '../../domain/finance/calendar'
import { contribuicaoPainelValida, fontesNecessariasPainel, normalizarConsultaPainel, validarSnapshotPainel } from '../../domain/finance/contracts/painel'
import type { ConsultaPainel, PaginaPainel } from '../../domain/finance/contracts/painel'
import { camposPermitidos, registro } from '../../domain/finance/errors'
import { registerPrivateFinanceResource } from '../../domain/finance/sessionResources'

const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).byteLength
function congelar<T>(v: T): T {
  if (v && typeof v === 'object') { Object.values(v).forEach(congelar); Object.freeze(v) }
  return v
}
/** Session memory only. Getting an entry never renews its server snapshot or TTL. */
export function createPainelCache(ctx: Readonly<{ uid: string; generation: number; atual: () => boolean; agora?: () => number }>) {
  const agora = ctx.agora ?? Date.now
  let entradas = new Map<string, PaginaPainel>(), disposed = false
  const unregister = registerPrivateFinanceResource(invalidarSessao)
  function invalidarSessao() { if (disposed) return; disposed = true; entradas.clear(); unregister() }
  function atual() {
    if (!ctx.atual()) invalidarSessao()
    if (disposed) return false
    for (const [key, p] of entradas) if (!validarSnapshotPainel(p.snapshot, { uid: ctx.uid, generation: ctx.generation, agora: agora() }).ok) entradas.delete(key)
    return true
  }
  const chave = (q: ConsultaPainel, t: string) => JSON.stringify([ctx.uid, ctx.generation, q, t])
  return {
    guardar(input: PaginaPainel): boolean {
      if (!atual()) return false
      try {
        if (!registro(input) || !camposPermitidos(input, ['consulta', 'snapshot', 'contribuicoes', 'cobertura', 'completo', 'cursor']) || typeof input.completo !== 'boolean' || !Array.isArray(input.contribuicoes) || !Array.isArray(input.cobertura) || 'cursor' in input && (typeof input.cursor !== 'string' || !input.cursor.length || input.cursor.length > 4096)) return false
        const q = normalizarConsultaPainel(input.consulta), t = validarSnapshotPainel(input.snapshot, { uid: ctx.uid, generation: ctx.generation, agora: agora() })
        if (!q.ok || !t.ok || input.contribuicoes.some(row => !contribuicaoPainelValida(row, q.valor))) return false
        const vistas = new Map<string, string>()
        for (const row of input.contribuicoes) {
          if (vistas.has(row.chave)) return false
          vistas.set(row.chave, JSON.stringify(row))
        }
        const fontes = fontesNecessariasPainel(q.valor.base), meses: string[] = []
        for (let i = 0; i < (q.valor.modo === 'mensal' ? 1 : 12); i++) { const m = avancarCompetencia(q.valor.inicio, i); if (!m.ok) return false; meses.push(m.valor) }
        for (const c of input.cobertura) if (!registro(c) || !camposPermitidos(c, ['fonte', 'fase', 'competencia', 'estado']) || !fontes.some(f => f === c.fonte) || !meses.some(m => m === c.competencia) || typeof c.fase !== 'string' || typeof c.estado !== 'string' || !['naoIniciada', 'emAndamento', 'completa', 'indisponivel', 'erro'].includes(c.estado)) return false
        if (input.completo && (!input.cobertura.every(c => c.estado === 'completa') || meses.some(m => fontes.some(f => !input.cobertura.some(c => c.fonte === f && c.competencia === m))))) return false
        const copia = congelar(structuredClone({ ...input, consulta: q.valor, snapshot: t.valor }))
        const key = chave(q.valor, t.valor.readTime)
        if (bytes([key, copia]) > 8 * 1024 * 1024) return false
        const candidatas = new Map(entradas)
        candidatas.delete(key); candidatas.set(key, copia)
        while (candidatas.size > 2 || bytes([...candidatas]) > 8 * 1024 * 1024) candidatas.delete(candidatas.keys().next().value!)
        entradas = candidatas
        return true
      } catch { return false }
    },
    obter(input: ConsultaPainel, readTime?: string): PaginaPainel | undefined {
      if (!atual()) return undefined
      const q = normalizarConsultaPainel(input)
      if (!q.ok) return undefined
      const encontrado = [...entradas].reverse().find(([, p]) => JSON.stringify(p.consulta) === JSON.stringify(q.valor) && (readTime === undefined || p.snapshot.readTime === readTime))
      if (!encontrado) return undefined
      entradas.delete(encontrado[0]); entradas.set(...encontrado)
      return encontrado[1]
    },
    invalidarSessao,
  }
}
