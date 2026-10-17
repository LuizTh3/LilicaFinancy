import { expect, it } from 'vitest'
import { criarRecorrenciaDouble, comandoMaterializar } from './recurrenceDouble.testSupport'
import { ler } from '../testing.testSupport'

it('materializa idempotentemente, preserva existentes e rejeita13 competências', async () => {
  const repo = criarRecorrenciaDouble()
  const command = comandoMaterializar()
  const first = await repo.materializar(command)
  expect(first.ok).toBe(true)
  expect(await repo.materializar(command)).toEqual(first)
  expect(repo.estado()).toHaveLength(2)
  expect((await repo.materializar({ ...command, operationKey: 'op2' })).ok).toBe(true)
  expect(repo.estado()).toHaveLength(2)
  expect((await repo.materializar({ ...command, operationKey: 'op3', payload: { ...command.payload, competencias: Array.from({ length: 13 }, (_, i) => `${2026 + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}`) } })).ok).toBe(false)
})
it('confirma uma ocorrência uma vez com recibo, sem mudar molde ou demais meses', async () => {
  const repo = criarRecorrenciaDouble()
  ler(await repo.materializar(comandoMaterializar()))
  const nov = repo.estado().find(o => o.competenciaOcorrencia === '2026-11')!
  const command = { contractVersion: 1 as const, tipo: 'confirmarValorOcorrencia' as const, operationKey: 'confirmar', expectedVersions: [{ id: nov.id, version: 1 }], payload: { ocorrenciaId: nov.id, valorDefinitivo: 16327 } }
  repo.falha('depois')
  expect((await repo.confirmar(command)).ok).toBe(false)
  expect((await repo.confirmar(command)).ok).toBe(true)
  expect(repo.estado().find(o => o.id === nov.id)).toMatchObject({ version: 2, valorCentavos: 16327, estimado: false })
  expect(repo.estado().find(o => o.competenciaOcorrencia === '2026-12')).toMatchObject({ version: 1, valorCentavos: 15000, estimado: true })
  expect((await repo.confirmar({ ...command, operationKey: 'concorrente' })).ok).toBe(false)
})
it('falha antes do commit não deixa período parcialmente materializado e molde antigo conflita', async () => {
  const repo = criarRecorrenciaDouble()
  const command = comandoMaterializar()
  repo.falha('antes')
  expect((await repo.materializar(command)).ok).toBe(false)
  expect(repo.estado()).toEqual([])
  expect((await repo.materializar({ ...command, expectedVersions: [{ id: 'energia', version: 9 }] })).ok).toBe(false)
  expect((await repo.materializar(command)).ok).toBe(true)
})
