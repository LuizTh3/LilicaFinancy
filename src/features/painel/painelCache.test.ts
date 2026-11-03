import { expect, it } from 'vitest'
import { createPainelCache } from './painelCache'
import { fontesPainel } from '../../domain/finance/contracts/painel'
import type { PaginaPainel } from '../../domain/finance/contracts/painel'
const t = '2026-10-21T12:00:00Z'
function pagina(mes = '2026-11'): PaginaPainel { return { consulta: { contractVersion: 1, base: 'planejamento', inicio: mes, fim: mes, modo: 'mensal', filtros: {} }, snapshot: { uid: 'A', generation: 1, contractRevision: 1, readTime: t, expiresAt: Date.parse(t) + 3000000, hojeFinanceiro: '2026-10-21' }, contribuicoes: [], cobertura: fontesPainel.map(fonte => ({ fonte, fase: 'dados', competencia: mes, estado: 'completa' })), completo: true } }
it('cache conserva readTime e prazo sem renovar ao ler e apaga no vencimento', () => {
  let agora = Date.parse(t) + 1000
  const cache = createPainelCache({ uid: 'A', generation: 1, atual: () => true, agora: () => agora })
  expect(cache.guardar(pagina())).toBe(true)
  agora += 2000000
  expect(cache.obter(pagina().consulta)?.snapshot.expiresAt).toBe(Date.parse(t) + 3000000)
  agora = Date.parse(t) + 3000000
  expect(cache.obter(pagina().consulta)).toBeUndefined()
  cache.invalidarSessao()
})
it('mantém duas janelas e expulsa a inativa, sem misturar base ou filtros', () => {
  const cache = createPainelCache({ uid: 'A', generation: 1, atual: () => true, agora: () => Date.parse(t) + 1000 })
  cache.guardar(pagina('2026-10')); cache.guardar(pagina('2026-11'))
  cache.obter(pagina('2026-10').consulta)
  cache.guardar(pagina('2026-12'))
  expect(cache.obter(pagina('2026-11').consulta)).toBeUndefined()
  expect(cache.obter({ ...pagina('2026-10').consulta, base: 'caixa' })).toBeUndefined()
  expect(cache.obter({ ...pagina('2026-10').consulta, filtros: { categorias: ['cat'] } })).toBeUndefined()
  expect(cache.obter(pagina('2026-10').consulta, '2026-10-21T12:00:01Z')).toBeUndefined()
  cache.invalidarSessao()
})
it('recusa sessão divergente e resposta mutada não altera a cópia em cache', () => {
  let atual = true
  const cache = createPainelCache({ uid: 'A', generation: 1, atual: () => atual, agora: () => Date.parse(t) + 1000 })
  expect(cache.guardar({ ...pagina(), snapshot: { ...pagina().snapshot, uid: 'B' } })).toBe(false)
  const p = pagina(), coberturaMutavel = { ...p.cobertura[0] }
  cache.guardar({ ...p, cobertura: [coberturaMutavel, ...p.cobertura.slice(1)] })
  coberturaMutavel.estado = 'erro'
  expect(cache.obter(p.consulta)?.cobertura[0].estado).toBe('completa')
  expect(Object.isFrozen(cache.obter(p.consulta))).toBe(true)
  atual = false
  expect(cache.obter(p.consulta)).toBeUndefined()
  expect(cache.guardar(p)).toBe(false)
})
it('rejeita janela acima de8MiB integralmente e conserva a anterior', () => {
  const cache = createPainelCache({ uid: 'A', generation: 1, atual: () => true, agora: () => Date.parse(t) + 1000 })
  const anterior = pagina('2026-10'); cache.guardar(anterior)
  const grande = { ...pagina(), contribuicoes: Array.from({ length: 16000 }, (_, i) => ({ chave: `parcelaExterna:${'a'.repeat(150)}${i}`, autoridade: 'parcelaExterna' as const, origemId: 'a'.repeat(160), competencia: '2026-11', dataFinanceira: '2026-11-10', base: 'planejamento' as const, natureza: 'saida' as const, valorCentavos: 100, liquidadoCentavos: 0, estadoObrigacao: 'ativa' as const, estimado: false, fonte: 'persistida' as const, revisao: 1, etiquetaIds: Array.from({ length: 5 }, (_, n) => 'e'.repeat(63) + n) })) }
  expect(new TextEncoder().encode(JSON.stringify(grande)).byteLength).toBeGreaterThan(8 * 1024 * 1024)
  expect(cache.guardar(grande)).toBe(false)
  expect(cache.obter(anterior.consulta)).toBeDefined()
  expect(cache.obter(grande.consulta)).toBeUndefined()
  cache.invalidarSessao()
})
