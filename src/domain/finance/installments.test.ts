import { expect, it } from 'vitest'
import { montarCronograma } from './installments'
import { dataCalendario } from './calendar'
import { somarCentavos } from './money'
import { congelar, ler } from './testing.testSupport'

const nova = { origemDados: 'nova', totalCentavos: 10000, quantidadeOriginal: 3, primeiraCompetencia: '2026-12', primeiroVencimento: '2027-01-31', diaAncora: 31 } as const
it('conserva soma, ordinais e diferença entre planejamento e vencimento', () => {
  const result = ler(montarCronograma(congelar(nova)))
  expect(result.map(p => p.valorCentavos)).toEqual([3334, 3333, 3333])
  expect(result.map(p => p.vencimento)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31'])
  expect(result.map(p => p.competenciaPlanejamento)).toEqual(['2026-12', '2027-01', '2027-02'])
  expect(result.map(p => p.numero)).toEqual([1, 2, 3])
})

it('mede informativamente geração e validação de12 parcelas sem assert de tempo', () => {
  const input = { ...nova, totalCentavos: 120001, quantidadeOriginal: 12, primeiraCompetencia: '2027-01' }
  const run = () => {
    const result = ler(montarCronograma(input))
    if (ler(somarCentavos(result.map(p => p.valorCentavos))) !== 120001 || !result.every(p => dataCalendario(p.vencimento).ok)) throw new Error('Cronograma inválido no benchmark')
  }
  for (let i = 0; i < 50; i++) run()
  const samples: number[] = []
  for (let i = 0; i < 1000; i++) { const start = performance.now(); run(); samples.push(performance.now() - start) }
  samples.sort((a, b) => a - b)
  console.info('FINANCE_BENCHMARK', JSON.stringify({ node: process.version, iterations: samples.length, p95Ms: samples[949] }))
  expect(samples).toHaveLength(1000)
})
it('migra apenas parcelas5..10 sem inferir total original ou pagamentos', () => {
  const input = { ...nova, origemDados: 'migrada', totalCentavos: undefined, saldoMigradoCentavos: 60000, quantidadeOriginal: 10, numeroInicial: 5 }
  const result = ler(montarCronograma(input))
  expect(result).toHaveLength(6)
  expect(result.map(p => p.numero)).toEqual([5, 6, 7, 8, 9, 10])
  expect(result.every(p => p.valorCentavos === 10000)).toBe(true)
  expect(result[0]).not.toHaveProperty('valorTotalOriginal')
  expect(montarCronograma({ ...input, valoresConhecidos: [10000] }).ok).toBe(false)
  expect(montarCronograma({ ...input, valoresConhecidos: [1, 1, 1, 1, 1, 1] }).ok).toBe(false)
  expect(ler(montarCronograma({ ...input, valoresConhecidos: [9999, 10001, 10000, 10000, 10000, 10000] }))[0].valorCentavos).toBe(9999)
})
it('rejeita séries fora dos limites e cópia divergente do vencimento da fatura', () => {
  expect(montarCronograma({ ...nova, quantidadeOriginal: 13 }).ok).toBe(false)
  expect(montarCronograma({ ...nova, totalCentavos: 1 }).ok).toBe(false)
  expect(montarCronograma({ ...nova, primeiraCompetencia: '9999-12' }).ok).toBe(false)
  const faturas = [
    { competencia: '2026-12', fechamento: '2026-11-25', vencimento: '2026-12-05' },
    { competencia: '2027-01', fechamento: '2026-12-25', vencimento: '2027-01-05' },
    { competencia: '2027-02', fechamento: '2027-01-25', vencimento: '2027-02-05' },
  ]
  expect(ler(montarCronograma({ ...nova, faturas }))[0].vencimento).toBe('2026-12-05')
  expect(montarCronograma({ ...nova, faturas, vencimentosCopiados: ['2026-12-20', '2027-01-05', '2027-02-05'] }).ok).toBe(false)
})
