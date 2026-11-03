import { beforeEach, expect, it, vi } from 'vitest'
import type { Firestore } from 'firebase/firestore'
import { createParceladosRepository } from './parceladosRepository'
import { normalizarCriacaoParcelada } from '../../domain/finance/parceladosCommands'
import { entradaParceladaTeste } from '../../domain/finance/parcelados.testSupport'
import { ler } from '../../domain/finance/testing.testSupport'

const state = vi.hoisted(() => ({ docs: new Map<string, Record<string, unknown>>(), reads: [] as string[], txReads: [] as string[], habilitado: false, falharAntes: false, callbackExecutions: 0 }))
vi.mock('../../domain/finance/operationBudget', async original => ({ ...await original<typeof import('../../domain/finance/operationBudget')>(), perfilParceladosRemoto: () => state.habilitado ? { status: 'validadoNoProjeto', evidencia: 'LOCAL_TEST_ONLY', acessosMaximos: 18, acessosPorEscrita: [5, 7, 2, 2], mutacoesMaximas: 4 } : { status: 'naoHabilitado' } }))
vi.mock('firebase/firestore', async original => {
  const sdk = await original<typeof import('firebase/firestore')>()
  const snapshot = (path: string) => ({ exists: () => state.docs.has(path), data: () => state.docs.get(path) })
  return { ...sdk, doc: (_db: unknown, ...parts: string[]) => ({ path: parts.join('/') }), serverTimestamp: () => sdk.Timestamp.fromMillis(2000), getDocFromServer: async (r: { path: string }) => { state.reads.push(r.path); return snapshot(r.path) }, runTransaction: async (_db: unknown, callback: (tx: unknown) => Promise<unknown>) => {
    state.callbackExecutions++
    let writing = false
    const writes: { path: string; data: Record<string, unknown>; patch: boolean }[] = []
    const result = await callback({ get: async (r: { path: string }) => { if (writing) throw Error('READ_AFTER_WRITE'); state.reads.push(r.path); state.txReads.push(r.path); return snapshot(r.path) }, set: (r: { path: string }, data: Record<string, unknown>) => { writing = true; writes.push({ path: r.path, data, patch: false }) }, update: (r: { path: string }, data: Record<string, unknown>) => { writing = true; writes.push({ path: r.path, data, patch: true }) } })
    if (state.falharAntes) throw Error('FAIL_BEFORE_COMMIT')
    for (const w of writes) state.docs.set(w.path, w.patch ? { ...state.docs.get(w.path), ...w.data } : w.data)
    return result
  } }
})
const db = {} as Firestore, ctx = { uid: 'A', generation: 1, atual: () => true, agora: () => 2000 }
const descritor = { contractVersion: 1 as const, tipo: 'criarSerie' as const, operationKey: 'intent', serieId: 'serie', expectedVersion: 0 }
function input() { const c = ler(normalizarCriacaoParcelada({ descritor, entrada: entradaParceladaTeste })); return { descritor, entrada: entradaParceladaTeste, conferencia: c.conferencia } }
beforeEach(async () => {
  state.docs.clear(); state.reads = []; state.txReads = []; state.habilitado = true; state.falharAntes = false; state.callbackExecutions = 0
  const { Timestamp } = await import('firebase/firestore')
  for (const [collection, id, extra] of [['categorias', 'cat', { natureza: 'despesa' }], ['titulares', 'holder', {}], ['contas', 'account', { tipo: 'banco' }], ['etiquetas', 'a', {}], ['etiquetas', 'b', {}]] as const) state.docs.set(`users/A/${collection}/${id}`, { nome: id, estado: 'ativo', schemaVersion: 1, version: 1, createdAt: Timestamp.fromMillis(1000), updatedAt: Timestamp.fromMillis(1000), ...extra })
})
it('não lê nem escreve quando o perfil real não está aprovado', async () => {
  state.habilitado = false
  expect(await createParceladosRepository(db, ctx).criarSerie(input())).toMatchObject({ ok: false, erro: { codigo: 'configuracaoPendente' } })
  expect(state.reads).toEqual([])
  expect(state.callbackExecutions).toBe(0)
})
it('confirma agregado/recibo/primeiro uso juntos, sem pagamentos ou receita, e repete uma vez', async () => {
  const repo = createParceladosRepository(db, ctx), result = await repo.criarSerie(input())
  expect(result).toMatchObject({ ok: true, valor: { operacaoId: 'criarSerie__intent', resultVersions: { serie: 1 } } })
  expect(state.docs.size).toBe(8)
  expect(state.docs.get('users/A/validacoesParceladas/criarSerie__intent__serie')).toMatchObject({ schemaVersion: 1, serieId: 'serie', eventoId: 'criarSerie__intent', resultVersion: 1 })
  expect(state.txReads).not.toContain('users/A/seriesParceladas/serie')
  expect(state.docs.get('users/A/seriesParceladas/serie')).toMatchObject({ numeroInicial: 5, quantidadeOriginal: 10, version: 1 })
  expect(state.docs.get('users/A/categorias/cat')).toMatchObject({ usoFinanceiro: { eventoId: 'criarSerie__intent', origemId: 'serie' } })
  expect(await repo.criarSerie(input())).toEqual(result)
  expect(state.docs.size).toBe(8)
})
it('aceita orçamento máximo18 localmente com cinco etiquetas e quatro mutações atômicas', async () => {
  const { Timestamp } = await import('firebase/firestore')
  for (const id of ['c', 'd', 'e']) state.docs.set(`users/A/etiquetas/${id}`, { nome: id, estado: 'ativo', schemaVersion: 1, version: 1, createdAt: Timestamp.fromMillis(1000), updatedAt: Timestamp.fromMillis(1000) })
  const entrada = { ...entradaParceladaTeste, referencias: { ...entradaParceladaTeste.referencias, etiquetaIds: ['a', 'b', 'c', 'd', 'e'] } }
  const normalized = ler(normalizarCriacaoParcelada({ descritor, entrada }))
  expect(await createParceladosRepository(db, ctx).criarSerie({ descritor, entrada, conferencia: normalized.conferencia })).toMatchObject({ ok: true })
  expect(state.docs.has('users/A/validacoesParceladas/criarSerie__intent__serie')).toBe(true)
  expect(state.txReads).toEqual(['users/A/operacoesParceladas/criarSerie__intent', 'users/A/categorias/cat'])
})
it('recibo confirmado prevalece sobre referência arquivada depois e chave divergente conflita', async () => {
  const repo = createParceladosRepository(db, ctx), result = await repo.criarSerie(input())
  state.docs.delete('users/A/categorias/cat')
  expect(await repo.criarSerie(input())).toEqual(result)
  const alterado = { ...entradaParceladaTeste, descricao: 'Outro' }, normalizado = ler(normalizarCriacaoParcelada({ descritor, entrada: alterado }))
  expect(await repo.criarSerie({ descritor, entrada: alterado, conferencia: normalizado.conferencia })).toMatchObject({ ok: false, erro: { codigo: 'conflitoIdempotencia' } })
})
it('falha antes do commit preserva conjunto e resposta perdida recupera recibo', async () => {
  state.falharAntes = true
  expect((await createParceladosRepository(db, ctx).criarSerie(input())).ok).toBe(false)
  expect(state.docs.size).toBe(5)
  state.falharAntes = false
  expect(await createParceladosRepository(db, ctx, async () => { throw Error('RESPONSE_LOST') }).criarSerie(input())).toMatchObject({ ok: true, valor: { estado: 'confirmado' } })
  expect(state.docs.size).toBe(8)
})
it('nega conferência desatualizada, sessão substituída e identidade já usada', async () => {
  expect((await createParceladosRepository(db, ctx).criarSerie({ ...input(), conferencia: 'stale' })).ok).toBe(false)
  expect((await createParceladosRepository(db, { ...ctx, atual: () => false }).criarSerie(input())).ok).toBe(false)
  state.docs.set('users/A/seriesParceladas/serie', { sentinel: true })
  expect(await createParceladosRepository(db, ctx).criarSerie(input())).toMatchObject({ ok: false, erro: { codigo: 'conflitoVersao' } })
  expect(state.docs.get('users/A/seriesParceladas/serie')).toEqual({ sentinel: true })
})
