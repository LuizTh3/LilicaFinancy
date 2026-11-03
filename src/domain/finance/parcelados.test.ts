import { expect, it } from 'vitest'
import { prepararCriacao, validarSerieParcelada } from './parcelados'
import { identidadeParcelaExterna } from './parceladosValidation'
import { ler } from './testing.testSupport'

import { entradaParceladaTeste, serieParceladaTeste } from './parcelados.testSupport'
it('próxima 5/10 gera apenas seis obrigações, sem original, passado pago ou entrada inferidos', () => {
  const p = ler(prepararCriacao(entradaParceladaTeste, 'criarSerie__intent'))
  expect(Object.keys(p.dados.parcelas)).toEqual(['p05', 'p06', 'p07', 'p08', 'p09', 'p10'])
  expect(Object.values(p.dados.parcelas).map(p => p.numero)).toEqual([5, 6, 7, 8, 9, 10])
  expect(p.totalCadastradoCentavos).toBe(120000)
  expect('valorOriginalCentavos' in p.dados).toBe(false)
  expect(Object.values(p.dados.parcelas).every(p => p.liquidadoLiquidoCentavos === 0 && !p.jaLiquidada)).toBe(true)
  expect('fato' in p).toBe(false)
  expect('receitaVinculadaId' in p.dados).toBe(false)
  expect(p.dados.parcelas.p09.vencimento).toBe('2027-02-28')
  expect(p.dados.parcelas.p10.vencimento).toBe('2027-03-31')
})
it('100/3 usa resto determinístico e mantém original informado independente do total', () => {
  const p = ler(prepararCriacao({ ...entradaParceladaTeste, origemDados: 'nova', numeroInicial: 1, quantidadeOriginal: 3, valorOriginalCentavos: 9000, calculo: { tipo: 'total', totalCentavos: 10000 } }, 'criarSerie__intent'))
  expect(Object.values(p.dados.parcelas).map(p => p.valorCentavos)).toEqual([3334, 3333, 3333])
  expect(p.dados.valorOriginalCentavos).toBe(9000)
  expect(p.calculo).toEqual({ tipo: 'total', totalCentavos: 10000, q: 3333, resto: 1 })
})
it('modo explícito conserva valores/datas/competências informados, inclusive datas iguais', () => {
  const { diaAncora: _, primeiroVencimento: __, primeiraCompetencia: ___, ...base } = entradaParceladaTeste
  const p = ler(prepararCriacao({ ...base, modo: 'explicito', numeroInicial: 9, cronograma: [{ numero: 9, valorCentavos: 15050, vencimento: '2026-10-21', competenciaPlanejamento: '2026-11' }, { numero: 10, valorCentavos: 13500, vencimento: '2026-10-21', competenciaPlanejamento: '2026-12' }], calculo: { tipo: 'explicito' } }, 'criarSerie__intent'))
  expect(p.totalCadastradoCentavos).toBe(28550)
  expect(p.dados.competencias).toEqual(['2026-11', '2026-12'])
  expect(p.dados.parcelas.p09.valorCentavos).toBe(15050)
  expect('taxa' in p.dados).toBe(false)
})
it('rejeita incompleto, datas fora da âncora, zero, overflow, campos desconhecidos e limites', () => {
  for (const patch of [{ numeroInicial: 0 }, { quantidadeOriginal: 13 }, { origemDados: 'nova' }, { calculo: { tipo: 'porParcela', valorCentavos: Number.MAX_SAFE_INTEGER } }, { calculo: { tipo: 'total', totalCentavos: 1 } }, { primeiroVencimento: '2026-10-30' }, { primeiraCompetencia: '9999-12' }, { valorOriginalCentavos: 0 }, { receitaVinculadaId: 'income' }, { referencias: { categoriaId: 'cat', etiquetaIds: ['a', 'a'] } }]) expect(prepararCriacao({ ...entradaParceladaTeste, ...patch }, 'criarSerie__intent').ok).toBe(false)
})
it('aceita P=N, 1/1 e máximo seguro quando a soma não excede o limite', () => {
  for (const n of [1, 12]) {
    const p = ler(prepararCriacao({ ...entradaParceladaTeste, numeroInicial: n, quantidadeOriginal: n, calculo: { tipo: 'total', totalCentavos: Number.MAX_SAFE_INTEGER } }, 'criarSerie__intent'))
    expect(Object.keys(p.dados.parcelas)).toHaveLength(1)
    expect(p.totalCadastradoCentavos).toBe(Number.MAX_SAFE_INTEGER)
  }
})
it('valida doze posições e rejeita cronogramas explícitos incompletos, duplicados ou fora de ordem', () => {
  const completa = ler(prepararCriacao({ ...entradaParceladaTeste, numeroInicial: 1, quantidadeOriginal: 12, origemDados: 'nova', calculo: { tipo: 'porParcela', valorCentavos: 100 } }, 'criarSerie__intent'))
  expect(Object.keys(completa.dados.parcelas)).toHaveLength(12)
  expect(prepararCriacao({ ...entradaParceladaTeste, calculo: { tipo: 'porParcela', valorCentavos: 0 } }, 'criarSerie__intent').ok).toBe(false)
  const { diaAncora: _, primeiroVencimento: __, primeiraCompetencia: ___, ...base } = entradaParceladaTeste
  const a = { numero: 9, valorCentavos: 100, vencimento: '2026-10-21', competenciaPlanejamento: '2026-10' }
  const b = { numero: 10, valorCentavos: 200, vencimento: '2026-11-21', competenciaPlanejamento: '2026-11' }
  for (const cronograma of [[a], [a, a], [b, a], [a, { ...b, vencimento: '2026-10-20' }], [a, { ...b, vencimento: '2026-02-30' }], [a, { ...b, valorCentavos: 0 }]]) expect(prepararCriacao({ ...base, modo: 'explicito', numeroInicial: 9, calculo: { tipo: 'explicito' }, cronograma }, 'criarSerie__intent').ok).toBe(false)
})
it('constrói agregado fechado e rejeita passado inventado, índice derivado falso e saldo inconsistente', () => {
  const s = serieParceladaTeste()
  expect(validarSerieParcelada(s).ok).toBe(true)
  for (const patch of [{ parcelas: { ...s.parcelas, p01: { ...s.parcelas.p05, numero: 1 } } }, { competencias: [] }, { parcelas: { ...s.parcelas, p05: { ...s.parcelas.p05, liquidadoLiquidoCentavos: 1 } } }, { receitaVinculadaId: 'bad/id' }, { schemaVersion: 2 }, { liquidadoCentavos: 1 }]) expect(validarSerieParcelada({ ...s, ...patch }).ok).toBe(false)
  expect(validarSerieParcelada({ ...s, parcelas: { ...s.parcelas, p05: { ...s.parcelas.p05, jaLiquidada: true } } }).ok).toBe(false)
})
it('identidade reversível por série e ordinal não confunde cartão, recorrência ou versão', () => {
  expect(ler(identidadeParcelaExterna('serie', 5))).toBe('serie__p05')
  for (const [id, numero] of [['bad_id', 1], ['s', 0], ['s', 13]] as const) expect(identidadeParcelaExterna(id, numero).ok).toBe(false)
})
