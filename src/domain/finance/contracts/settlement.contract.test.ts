import { expect, it } from 'vitest'
import { criarLiquidacaoDouble, comandoPagamento } from './settlementDouble.testSupport'
import { snapshot, pagamento } from '../fixtures.testSupport'

it('duas versões esperadas concorrentes produzem uma confirmação e um conflito', async () => {
  const repo = criarLiquidacaoDouble(snapshot())
  const results = await Promise.all([repo.registrar(comandoPagamento('op1', 'p1', 6000)), repo.registrar(comandoPagamento('op2', 'p2', 6000))])
  expect(results.filter(result => result.ok)).toHaveLength(1)
  expect(results.filter(result => !result.ok && result.erro.codigo === 'conflitoVersao')).toHaveLength(1)
  expect(repo.estado().fatos).toHaveLength(1)
})
it('idempotência antecede versão antiga e resposta perdida não duplica fato', async () => {
  const repo = criarLiquidacaoDouble(snapshot())
  const command = comandoPagamento('op1', 'p1', 4000)
  repo.falha('depois')
  expect((await repo.registrar(command)).ok).toBe(false)
  expect(await repo.consultarOperacao('registrarLiquidacao', 'op1')).toMatchObject({ ok: true, valor: { estado: 'confirmado' } })
  expect((await repo.registrar(command)).ok).toBe(true)
  expect(repo.estado().fatos).toHaveLength(1)
  expect(repo.estado().version).toBe(4)
  repo.offline(true)
  expect(await repo.consultarOperacao('registrarLiquidacao', 'ausente')).toMatchObject({ ok: true, valor: { estado: 'indeterminado' } })
  repo.offline(false)
  expect(await repo.consultarOperacao('registrarLiquidacao', 'ausente')).toMatchObject({ ok: true, valor: { estado: 'ausenteConfirmado' } })
})
it('duas inversões não consomem duas vezes o mesmo original', async () => {
  const repo = criarLiquidacaoDouble(snapshot({ fatos: [pagamento()] }))
  const base = { contractVersion: 1 as const, tipo: 'aplicarCorrecao' as const, expectedVersions: [{ id: 'ob1', version: 3 }], payload: { tipo: 'reversaoPagamento' as const, id: 'r1', originalId: 'p1', valorCentavos: 4000, dataEfetiva: '2026-11-18', motivo: 'Correção' } }
  const results = await Promise.all([repo.corrigir({ ...base, operationKey: 'r1' }), repo.corrigir({ ...base, operationKey: 'r2', payload: { ...base.payload, id: 'r2' } })])
  expect(results.filter(r => r.ok)).toHaveLength(1)
  expect(repo.estado().fatos).toHaveLength(2)
})

it('rejeita schema desconhecido, alvo alheio e falha anterior sem efeitos', async () => {
  const incompatible = criarLiquidacaoDouble(snapshot({ schemaVersion: 9 }))
  expect(await incompatible.registrar(comandoPagamento())).toMatchObject({ ok: false, erro: { codigo: 'esquemaIncompativel' } })
  const repo = criarLiquidacaoDouble(snapshot())
  const command = comandoPagamento()
  expect((await repo.registrar({ ...command, payload: { ...command.payload, alvo: { tipo: 'obrigacaoExternaAvulsa', id: 'alvoB' } } })).ok).toBe(false)
  repo.falha('antes')
  expect((await repo.registrar(command)).ok).toBe(false)
  expect(repo.estado().fatos).toHaveLength(0)
  expect((await repo.registrar(command)).ok).toBe(true)
  expect((await repo.registrar({ ...command, payload: { ...command.payload, comando: { ...command.payload.comando, valorCentavos: 1 } } })).ok).toBe(false)
})
