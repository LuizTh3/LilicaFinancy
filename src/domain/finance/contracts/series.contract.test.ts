import { expect, it } from 'vitest'
import { criarSerieDouble, comandoSerie } from './seriesDouble.testSupport'

it('confirma uma série inteira e repete o mesmo recibo sem duplicação', async () => {
  const repo = criarSerieDouble('A')
  const command = comandoSerie()
  const first = await repo.criar(command)
  expect(first.ok).toBe(true)
  expect(await repo.criar(command)).toEqual(first)
  expect(repo.estado()).toMatchObject({ origens: 1, parcelas: 3, faturas: 3, recibos: 1 })
  expect((await repo.criar({ ...command, payload: { ...command.payload, categoriaId: 'outra' } })).ok).toBe(false)
})
it('não deixa série parcial, recupera resposta perdida e rejeita ordinal faltante', async () => {
  const repo = criarSerieDouble('A')
  const command = comandoSerie()
  repo.falha('antes')
  expect((await repo.criar(command)).ok).toBe(false)
  expect(repo.estado()).toMatchObject({ origens: 0, parcelas: 0, recibos: 0 })
  repo.falha('depois')
  expect((await repo.criar(command)).ok).toBe(false)
  expect((await repo.consultarOperacao('criarCompra', command.operationKey)).ok).toBe(true)
  expect((await repo.criar(command)).ok).toBe(true)
  const missing = comandoSerie('op2', 'compra2')
  expect((await repo.criar({ ...missing, payload: { ...missing.payload, parcelas: missing.payload.parcelas.slice(0, 2) } })).ok).toBe(false)
  expect(repo.estado().origens).toBe(1)
})
it('diferentes chaves não duplicam origem, e referência deB é negada', async () => {
  const repo = criarSerieDouble('A')
  const command = comandoSerie()
  expect((await repo.criar(command)).ok).toBe(true)
  expect((await repo.criar({ ...command, operationKey: 'outra' })).ok).toBe(false)
  expect((await repo.criar({ ...comandoSerie('op3', 'compra3'), payload: { ...command.payload, origemId: 'compra3', categoriaId: 'categoriaB' } })).ok).toBe(false)
})

it('cartão arquivado não admite compra nova e a rejeição não cria série parcial', async () => {
  const repo = criarSerieDouble('A', [{ id: 'cat', uid: 'A', estadoCadastro: 'ativo' }, { id: 'card', uid: 'A', estadoCadastro: 'arquivado' }])
  expect((await repo.criar(comandoSerie())).ok).toBe(false)
  expect(repo.estado()).toEqual({ origens: 0, parcelas: 0, faturas: 0, recibos: 0 })
})
