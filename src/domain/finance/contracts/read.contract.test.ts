import { expect, it } from 'vitest'
import { criarLeituraDouble } from './readDouble.testSupport'
import { ler } from '../testing.testSupport'

const filtro = { baseTemporal: 'planejamento' as const, inicio: '2026-10', fim: '2026-11', pageSize: 1 }
it('pagina até50, ordena por competência+ID e não fornece total definitivo parcial', async () => {
  const repo = criarLeituraDouble('A', [{ id: 'b', uid: 'A', competencia: '2026-10' }, { id: 'a', uid: 'A', competencia: '2026-10' }, { id: 'z', uid: 'B', competencia: '2026-10' }])
  const first = ler(await repo.listar(filtro))
  expect(first.itens.map(i => i.id)).toEqual(['a'])
  expect(first.completo).toBe(false)
  expect(first).not.toHaveProperty('totalDefinitivo')
  const second = ler(await repo.listar({ ...filtro, cursor: first.proximaPagina }))
  expect(second.itens.map(i => i.id)).toEqual(['b'])
  expect(second.completo).toBe(true)
  expect((await repo.listar({ ...filtro, pageSize: 51 })).ok).toBe(false)
  expect((await repo.listar({ ...filtro, pageSize: 0 })).ok).toBe(false)
})
it('cursor pertence a usuário, base e filtros; revisão alterada exige reinício', async () => {
  const rows = [{ id: 'a', uid: 'A', competencia: '2026-10' }, { id: 'b', uid: 'A', competencia: '2026-10' }]
  const repo = criarLeituraDouble('A', rows), other = criarLeituraDouble('B', rows)
  const first = ler(await repo.listar(filtro))
  expect((await other.listar({ ...filtro, cursor: first.proximaPagina })).ok).toBe(false)
  expect((await repo.listar({ ...filtro, inicio: '2026-11', cursor: first.proximaPagina })).ok).toBe(false)
  expect((await repo.listar({ ...filtro, baseTemporal: 'consumo', cursor: first.proximaPagina })).ok).toBe(false)
  repo.alterarRevisao()
  const page = ler(await repo.listar({ ...filtro, cursor: first.proximaPagina }))
  expect(page.completo).toBe(false)
  expect(page.motivos).toContain('revisaoAlterada')
  expect(page).not.toHaveProperty('totalDefinitivo')
})
