import { beforeEach, expect, it, vi } from 'vitest'
import type { Firestore } from 'firebase/firestore'
import { createComprasFinanceirasRepository } from './comprasRepository'
import { normalizarIntencaoCriacaoCompra } from '../../domain/finance/comprasFinanceirasCommands'
import { prepararCriacaoCompraFinanceira } from '../../domain/finance/comprasFinanceiras'
import { cartaoCompraFinanceiraTeste, dadosCompraFinanceiraTeste, descritorCompraFinanceiraTeste, faturaCompraFinanceiraTeste } from '../../domain/finance/comprasFinanceiras.testSupport'
import { ler } from '../../domain/finance/testing.testSupport'

const state = vi.hoisted(() => ({ docs: new Map<string, Record<string, unknown>>(), reads: [] as string[], habilitado: true, falharAntes: false, repetirCallback: false, callbacks: 0, antesTx: undefined as (() => void) | undefined }))
vi.mock('../../domain/finance/operationBudget', async original => ({ ...await original<typeof import('../../domain/finance/operationBudget')>(), perfilComprasFinitaRemoto: () => state.habilitado ? { status: 'validadoNoProjeto', evidencia: 'LOCAL_TEST_ONLY', acessosMaximos: 18, acessosPorEscrita: [6, 7, 2], mutacoesMaximas: 5 } : { status: 'naoHabilitado' } }))
vi.mock('firebase/firestore', async original => {
  const sdk = await original<typeof import('firebase/firestore')>()
  const snapshot = (path: string) => ({ exists: () => state.docs.has(path), data: () => state.docs.get(path) })
  return { ...sdk, doc: (_db: unknown, ...parts: string[]) => ({ path: parts.join('/') }), serverTimestamp: () => new sdk.Timestamp(2, 123456000), getDocFromServer: async (ref: { path: string }) => { state.reads.push(ref.path); return snapshot(ref.path) }, runTransaction: async (_db: unknown, callback: (tx: unknown) => Promise<unknown>) => {
    state.antesTx?.()
    let result: unknown
    for (let attempt = 0; attempt < (state.repetirCallback ? 2 : 1); attempt++) {
      state.callbacks++; let writing = false
      const writes: { path: string; data: Record<string, unknown>; patch: boolean }[] = []
      result = await callback({ get: async (ref: { path: string }) => { if (writing) throw Error('READ_AFTER_WRITE'); state.reads.push(ref.path); return snapshot(ref.path) }, set: (ref: { path: string }, data: Record<string, unknown>) => { writing = true; writes.push({ path: ref.path, data, patch: false }) }, update: (ref: { path: string }, data: Record<string, unknown>) => { writing = true; writes.push({ path: ref.path, data, patch: true }) } })
      if (state.falharAntes) throw Error('FAIL_BEFORE_COMMIT')
      if (!state.repetirCallback || attempt === 1) for (const w of writes) state.docs.set(w.path, w.patch ? { ...state.docs.get(w.path), ...w.data } : w.data)
    }
    return result
  } }
})
const db = {} as Firestore, ctx = { uid: 'A', generation: 1, atual: () => true, hoje: '2026-11-01', agora: () => 2000 }
function input(n = 3) {
  const plano = ler(prepararCriacaoCompraFinanceira({ ...dadosCompraFinanceiraTeste, quantidadeParcelas: n }, { uid: 'A', hoje: ctx.hoje, cartao: cartaoCompraFinanceiraTeste, faturas: ['2026-11', '2026-12', '2027-01'].map(faturaCompraFinanceiraTeste), primeiroUsoCategoria: false }, { id: 'buy', eventoId: 'criarCompra__intent', instante: 2000 }))
  return ler(normalizarIntencaoCriacaoCompra({ descritor: descritorCompraFinanceiraTeste, compra: plano.compra }))
}
beforeEach(async () => {
  state.docs.clear(); state.reads = []; state.habilitado = true; state.falharAntes = false; state.repetirCallback = false; state.callbacks = 0; state.antesTx = undefined
  const { Timestamp } = await import('firebase/firestore'), stamp = Timestamp.fromMillis(1000)
  const { uid: _, id: __, ...card } = cartaoCompraFinanceiraTeste
  state.docs.set('users/A/cartoes/card', { ...card, createdAt: stamp, updatedAt: stamp })
  state.docs.set('users/A/categorias/cat', { nome: 'Categoria', natureza: 'despesa', estado: 'ativo', schemaVersion: 2, version: 1, createdAt: stamp, updatedAt: stamp, usoFinanceiro: { eventoId: 'criarDespesa__prior', origemId: 'prior', papel: 'classificacao', createdAt: stamp } })
  for (const mes of ['2026-11', '2026-12', '2027-01']) {
    const f = faturaCompraFinanceiraTeste(mes), { uid: _u, id: _i, conteudo, ...calendar } = f
    const { uid: _cu, faturaId: _fi, cartaoId: _ca, competencia: _co, ...control } = conteudo
    const precise = new Timestamp(1, 123456000)
    state.docs.set(`users/A/faturas/${f.id}`, { ...calendar, createdAt: stamp, updatedAt: stamp, conteudo: { ...control, createdAt: precise, updatedAt: precise } })
  }
})
it('mantém produção negada antes de ler qualquer documento', async () => {
  state.habilitado = false
  expect(await createComprasFinanceirasRepository(db, ctx).criarCompra(input())).toMatchObject({ ok: false, erro: { codigo: 'configuracaoPendente' } })
  expect(state.reads).toEqual([]); expect(state.callbacks).toBe(0)
})
it('cria100/3 em um compromisso, preserva calendário/timestamp imutável e repete sem segundo delta', async () => {
  const original = state.docs.get('users/A/faturas/card__2026-11')!, originalControl = original.conteudo as Record<string, unknown>
  const repo = createComprasFinanceirasRepository(db, ctx), result = await repo.criarCompra(input())
  expect(result).toMatchObject({ ok: true, valor: { estado: 'confirmado', compraId: 'buy', resultVersion: 1, verificacao: 'comandoCompleto' } })
  expect(state.docs.size).toBe(7)
  expect(state.docs.get('users/A/faturas/card__2026-11')).toMatchObject({ version: 1, conteudo: { version: 2, exigivelCentavos: 3334 } })
  expect((state.docs.get('users/A/faturas/card__2026-11')!.conteudo as Record<string, unknown>).createdAt).toBe(originalControl.createdAt)
  expect(state.docs.get('users/A/faturas/card__2026-11')!.updatedAt).toBe(original.updatedAt)
  expect(await repo.criarCompra(input())).toEqual(result)
  expect(state.callbacks).toBe(1)
  expect(state.reads.every(p => p.startsWith('users/A/'))).toBe(true)
  expect([...state.docs.keys()].some(p => /pagamentos|origensExternas/.test(p))).toBe(false)
})
it('recibo vence referências arquivadas e comando completo diferente conflita', async () => {
  const repo = createComprasFinanceirasRepository(db, ctx), original = input(), result = await repo.criarCompra(original)
  state.docs.delete('users/A/cartoes/card'); state.docs.delete('users/A/categorias/cat')
  expect(await repo.criarCompra(original)).toEqual(result)
  expect(await repo.criarCompra(input(2))).toMatchObject({ ok: false, erro: { codigo: 'conflitoIdempotencia' } })
})
it('primeiro uso cabe com duas posições, mas três são rejeitadas integralmente', async () => {
  const cat = state.docs.get('users/A/categorias/cat')!, { usoFinanceiro: _, ...semUso } = cat
  state.docs.set('users/A/categorias/cat', semUso)
  expect(await createComprasFinanceirasRepository(db, ctx).criarCompra(input())).toMatchObject({ ok: false, erro: { codigo: 'limiteOperacional' } })
  expect(state.docs.size).toBe(5)
  expect(await createComprasFinanceirasRepository(db, ctx).criarCompra(input(2))).toMatchObject({ ok: true })
  expect(state.docs.get('users/A/categorias/cat')).toMatchObject({ usoFinanceiro: { eventoId: 'criarCompra__intent', origemId: 'buy' } })
})
it('repetição do callback e perda da resposta conservam a mesma identidade e todos os deltas', async () => {
  state.repetirCallback = true
  expect(await createComprasFinanceirasRepository(db, ctx, async () => { throw Error('RESPONSE_LOST') }).criarCompra(input())).toMatchObject({ ok: true, valor: { estado: 'confirmado' } })
  expect(state.callbacks).toBe(2); expect(state.docs.size).toBe(7)
  expect((state.docs.get('users/A/faturas/card__2026-12')!.conteudo as Record<string, unknown>).exigivelCentavos).toBe(3333)
})
it('falha anterior ao commit, prévia obsoleta, identidade existente e troca de sessão não fazem escrita parcial', async () => {
  const repo = createComprasFinanceirasRepository(db, ctx), original = input()
  state.falharAntes = true
  expect((await repo.criarCompra(original)).ok).toBe(false); expect(state.docs.size).toBe(5)
  state.falharAntes = false
  expect(await repo.criarCompra({ ...original, conferencia: 'stale' })).toMatchObject({ ok: false, erro: { codigo: 'conflitoVersao' } })
  state.docs.set('users/A/compras/buy', { sentinel: true })
  expect(await repo.criarCompra(original)).toMatchObject({ ok: false, erro: { codigo: 'conflitoVersao' } })
  expect(state.docs.get('users/A/compras/buy')).toEqual({ sentinel: true })
  expect(await createComprasFinanceirasRepository(db, { ...ctx, atual: () => false }).criarCompra(original)).toMatchObject({ ok: false, erro: { codigo: 'semPermissao' } })
})
it('mudança entre prévia e transação exige nova conferência sem aplicar deltas antigos', async () => {
  state.antesTx = () => {
    const p = 'users/A/faturas/card__2026-11', f = state.docs.get(p)!, c = f.conteudo as Record<string, unknown>
    state.docs.set(p, { ...f, conteudo: { ...c, version: 2, exigivelCentavos: 500, ultimoEventoTipo: 'criarCompra', ultimoEventoId: 'criarCompra__other', ultimoEventoOrigemId: 'other' } })
  }
  expect(await createComprasFinanceirasRepository(db, ctx).criarCompra(input())).toMatchObject({ ok: false, erro: { codigo: 'conflitoVersao' } })
  expect(state.docs.has('users/A/compras/buy')).toBe(false)
  expect(state.docs.has('users/A/operacoesCompras/criarCompra__intent')).toBe(false)
  expect((state.docs.get('users/A/faturas/card__2026-11')!.conteudo as Record<string, unknown>).exigivelCentavos).toBe(500)
})
it('consulta distingue descritor de conferência completa e resposta tardia não promove sessão revogada', async () => {
  const repo = createComprasFinanceirasRepository(db, ctx), i = input()
  await repo.criarCompra(i)
  expect(await repo.consultarOperacao({ modo: 'descritor', descritor: i.descritor })).toMatchObject({ ok: true, valor: { estado: 'confirmado', verificacao: 'descritor' } })
  expect(await repo.consultarOperacao({ modo: 'comandoCompleto', intencao: i })).toMatchObject({ ok: true, valor: { verificacao: 'comandoCompleto' } })
  expect(await repo.consultarOperacao({ modo: 'comandoCompleto', intencao: input(2) })).toMatchObject({ ok: false, erro: { codigo: 'conflitoIdempotencia' } })
  state.docs.delete('users/A/compras/buy'); state.docs.delete('users/A/operacoesCompras/criarCompra__intent')
  // A separate fresh attempt is used only after resetting this synthetic test fixture.
  for (const mes of ['2026-11', '2026-12', '2027-01']) { const p = `users/A/faturas/card__${mes}`, f = state.docs.get(p)!; state.docs.set(p, { ...f, conteudo: { ...(f.conteudo as Record<string, unknown>), version: 1, exigivelCentavos: 0 } }) }
  let atual = true
  expect(await createComprasFinanceirasRepository(db, { ...ctx, atual: () => atual }, async () => { atual = false }).criarCompra(i)).toMatchObject({ ok: false, erro: { codigo: 'semPermissao' } })
})
