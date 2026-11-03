import { expect, it } from 'vitest'
import { createPainelState } from './painelState'
import { fontesPainel } from '../../domain/finance/contracts/painel'
import type { PaginaPainel } from '../../domain/finance/contracts/painel'
const t = '2026-10-20T12:00:00Z', now = Date.parse(t) + 1000
const consulta = { contractVersion: 1 as const, base: 'planejamento' as const, inicio: '2026-11', fim: '2026-11', modo: 'mensal' as const, filtros: {} }
function pagina(time = t): PaginaPainel { return { consulta, snapshot: { uid: 'A', generation: 1, readTime: time, expiresAt: Date.parse(time) + 50 * 60000, contractRevision: 1, hojeFinanceiro: '2026-10-20' }, completo: true, contribuicoes: [], cobertura: fontesPainel.map(fonte => ({ fonte, competencia: '2026-11', fase: 'dados', estado: 'completa' })) } }
function fixture() { let current = true; return { state: createPainelState({ uid: 'A', generation: 1, atual: () => current, agora: () => now }), invalidate: () => { current = false } } }
it('atualização mantém anterior coerente e só promove integralmente a nova', () => {
 const f = fixture(), first = f.state.iniciar(consulta)
 expect(f.state.receber(first, pagina())).toBe(true)
 const second = f.state.iniciar(consulta), newer = pagina('2026-10-20T12:00:01Z')
 expect(f.state.ler()).toMatchObject({ estado: 'carregando', anterior: { snapshot: { readTime: t } } })
 expect(f.state.receber(second, { ...newer, completo: false, cobertura: newer.cobertura.map(c => ({ ...c, estado: 'emAndamento' })) })).toBe(true)
 expect(f.state.ler()).toMatchObject({ estado: 'parcial', anterior: { snapshot: { readTime: t } }, emConstrucao: { snapshot: { readTime: newer.snapshot.readTime } } })
 expect(f.state.receber(second, newer)).toBe(true)
 expect(f.state.ler()).toMatchObject({ estado: 'completo', visivel: { snapshot: { readTime: newer.snapshot.readTime } } })
 expect(f.state.ler().anterior).toBeUndefined()
})
it('não promove página de outra sessão, consulta, instante ou cobertura incompleta', () => {
 for (const patch of [
  { snapshot: { ...pagina().snapshot, uid: 'B' } }, { consulta: { ...consulta, inicio: '2026-12', fim: '2026-12' } },
  { cobertura: [] }, { cobertura: pagina().cobertura.map(c => ({ ...c, estado: 'indisponivel' as const })) },
 ]) {
  const f = fixture(), id = f.state.iniciar(consulta)
  expect(f.state.receber(id, { ...pagina(), ...patch })).toBe(false)
  expect(f.state.ler().visivel).toBeUndefined()
 }
 const f = fixture(), id = f.state.iniciar(consulta)
 f.state.receber(id, { ...pagina(), completo: false })
 expect(f.state.receber(id, pagina('2026-10-20T12:00:01Z'))).toBe(false)
})
it('resposta tardia não promove versão antiga; invalidação elimina estado e filtros', () => {
 const f = fixture(), old = f.state.iniciar(consulta), current = f.state.iniciar(consulta)
 expect(f.state.receber(old, pagina())).toBe(false)
 expect(f.state.receber(current, pagina())).toBe(true)
 f.invalidate()
 expect(f.state.ler()).toEqual({ estado: 'invalidado' })
 expect(f.state.receber(current, pagina())).toBe(false)
})
it('falha preserva anterior identificada; semPermissao apaga em vez de reutilizar cache', () => {
 const f = fixture(); f.state.receber(f.state.iniciar(consulta), pagina())
 const refresh = f.state.iniciar(consulta)
 f.state.falhar(refresh, 'indisponivel')
 expect(f.state.ler()).toMatchObject({ estado: 'erro', anterior: { snapshot: { readTime: t } } })
 f.state.falhar(refresh, 'semPermissao')
 expect(f.state.ler()).toEqual({ estado: 'invalidado' })
})
it('teto8MiB não trunca contribuições para promover total falso', () => {
 const f = fixture(), id = f.state.iniciar(consulta)
 const oversized = { ...pagina(), extra: 'x'.repeat(8 * 1024 * 1024) }
 expect(f.state.receber(id, oversized)).toBe(false)
 expect(f.state.ler().visivel).toBeUndefined()
})
