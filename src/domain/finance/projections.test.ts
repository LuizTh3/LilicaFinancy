import { expect, it } from 'vitest'
import { projetarPeriodo } from './projections'
import { credito, dadosPeriodo, pagamento } from './fixtures.testSupport'
import { congelar, ler } from './testing.testSupport'

const data = dadosPeriodo({
  origens: [{ uid: 'A', id: 'compra1', tipo: 'compra', origemDados: 'nova', valorTotalCentavos: 10000, dataConsumo: '2026-10-17', categoriaId: 'cat' }],
  compromissos: [0, 1, 2].map((i) => ({ uid: 'A', id: `par${i}`, origemId: 'compra1', tipo: 'parcelaCartao' as const, faturaId: `f${i}`, valorCentavos: i === 0 ? 3334 : 3333, competenciaPlanejamento: ['2026-11', '2026-12', '2027-01'][i], vencimento: ['2026-11-17', '2026-12-17', '2027-01-17'][i], estadoObrigacao: 'ativa' as const })),
})

it('não ignora crédito órfão, origem faltante ou revisão inválida', () => {
  const range = { inicio: '2026-11', fim: '2026-11' }
  expect(projetarPeriodo('planejamento', range, { ...data, origens: [] }).ok).toBe(false)
  expect(projetarPeriodo('planejamento', range, { ...data, creditos: [credito({ alvo: { tipo: 'parcelaCartao', id: 'missing' } })] }).ok).toBe(false)
  expect(projetarPeriodo('planejamento', range, { ...data, revisao: { antes: 0, depois: 0 } }).ok).toBe(false)
  expect(projetarPeriodo(['consumo'], range, data).ok).toBe(false)
})
it('conta compra no consumo, parcelas no planejamento e só fatos no caixa', () => {
  const input = congelar(data)
  expect(ler(projetarPeriodo('consumo', { inicio: '2026-10', fim: '2026-10' }, input))).toMatchObject({ completo: true, totalDefinitivo: { saidasCentavos: 10000 } })
  expect(ler(projetarPeriodo('planejamento', { inicio: '2026-11', fim: '2026-11' }, input))).toMatchObject({ totalDefinitivo: { saidasCentavos: 3334 } })
  expect(ler(projetarPeriodo('caixa', { inicio: '2026-11', fim: '2026-11' }, input))).toMatchObject({ totalDefinitivo: { saidasCentavos: 0 } })
  const paid = { ...data, fatos: [pagamento({ alvo: { tipo: 'fatura', id: 'f0' }, valorCentavos: 3334 })] }
  expect(ler(projetarPeriodo('caixa', { inicio: '2026-11', fim: '2026-11' }, paid))).toMatchObject({ totalDefinitivo: { saidasCentavos: 3334 } })
  expect(ler(projetarPeriodo('planejamento', { inicio: '2026-11', fim: '2026-11' }, paid))).toMatchObject({ totalDefinitivo: { saidasCentavos: 3334 } })
})
it('estorno posterior preserva consumo original e reembolso afeta caixa uma vez', () => {
  const input = { ...data,
    estornos: [{ id: 'est1', uid: 'A', origemId: 'compra1', origemTipo: 'compra' as const, valorCentavos: 10000, dataEfeito: '2026-11-18', motivo: 'Devolução', operacaoId: 'op2' }],
    fatos: [pagamento({ id: 'p1', alvo: { tipo: 'fatura', id: 'f0' }, valorCentavos: 10000 }), pagamento({ id: 'rb1', tipo: 'reembolso', alvo: { tipo: 'fatura', id: 'f0' }, originalId: 'p1', estornoId: 'est1', motivo: 'Devolução', dataEfetiva: '2026-11-18', valorCentavos: 10000 })],
  }
  expect(ler(projetarPeriodo('consumo', { inicio: '2026-10', fim: '2026-10' }, input))).toMatchObject({ totalDefinitivo: { saidasCentavos: 10000, entradasCentavos: 0 } })
  expect(ler(projetarPeriodo('consumo', { inicio: '2026-11', fim: '2026-11' }, input))).toMatchObject({ totalDefinitivo: { entradasCentavos: 10000, consumoLiquido: { natureza: 'reducoesSuperioresAosGastos', magnitudeCentavos: 10000 } } })
  expect(ler(projetarPeriodo('caixa', { inicio: '2026-11', fim: '2026-11' }, input))).toMatchObject({ totalDefinitivo: { entradasCentavos: 10000, saidasCentavos: 10000 } })
})
it('planejamento explícito não muda vencimento ou caixa e incompletude não produz total', () => {
  const input = dadosPeriodo({ receitas: [{ uid: 'A', id: 'rec1', valorCentavos: 100000, competenciaPlanejamento: '2026-10', dataPrevista: '2026-11-17', estadoObrigacao: 'ativa', estimado: true }] })
  expect(ler(projetarPeriodo('planejamento', { inicio: '2026-10', fim: '2026-10' }, input))).toMatchObject({ totalDefinitivo: { entradasCentavos: 100000 } })
  expect(ler(projetarPeriodo('caixa', { inicio: '2026-10', fim: '2026-10' }, input))).toMatchObject({ totalDefinitivo: { entradasCentavos: 0 } })
  for (const partial of [dadosPeriodo({ completo: false }), dadosPeriodo({ revisao: { antes: 1, depois: 2 } }), dadosPeriodo({ origens: [{ uid: 'A', id: 'm1', tipo: 'compra', origemDados: 'migrada', saldoMigradoCentavos: 60000, categoriaId: 'cat' }] })]) {
    expect(ler(projetarPeriodo('consumo', { inicio: '2026-10', fim: '2026-10' }, partial))).toMatchObject({ completo: false })
    expect(ler(projetarPeriodo('consumo', { inicio: '2026-10', fim: '2026-10' }, partial))).not.toHaveProperty('totalDefinitivo')
  }
  expect(projetarPeriodo('consumo', { inicio: '2026-10', fim: '2026-10' }, { ...data, uid: 'B' }).ok).toBe(false)
})
