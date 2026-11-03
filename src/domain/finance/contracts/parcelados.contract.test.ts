import { expect, it } from 'vitest'
import { normalizarCriacaoParcelada, conferirCriacaoParcelada, descritorParceladoValido } from '../parceladosCommands'
import { entradaParceladaTeste } from '../parcelados.testSupport'
import { ler } from '../testing.testSupport'

const descritor = { contractVersion: 1, tipo: 'criarSerie', operationKey: 'intent', serieId: 'serie', expectedVersion: 0 }
it('normaliza comando fechado com um manifesto completo e conferência determinística', () => {
  const c = ler(normalizarCriacaoParcelada({ descritor, entrada: entradaParceladaTeste }))
  expect(c.comando.serieId).toBe('serie')
  expect(Object.keys(c.comando.criacao.dados.parcelas)).toHaveLength(6)
  expect(conferirCriacaoParcelada(c.comando, 'criarSerie__intent').ok).toBe(true)
  const reordered = { ...entradaParceladaTeste, referencias: { ...entradaParceladaTeste.referencias, etiquetaIds: ['a', 'b'] } }
  expect(ler(normalizarCriacaoParcelada({ descritor, entrada: reordered })).conferencia).toBe(c.conferencia)
  expect(ler(normalizarCriacaoParcelada({ descritor, entrada: { ...entradaParceladaTeste, descricao: 'Outra' } })).conferencia).not.toBe(c.conferencia)
})
it('rejeita corpo/cálculo/contraparte adulterados, campo extra e criação com versão existente', () => {
  const c = ler(normalizarCriacaoParcelada({ descritor, entrada: entradaParceladaTeste }))
  const m = c.comando.criacao
  for (const criacao of [{ ...m, dados: { ...m.dados, parcelas: {} } }, { ...m, calculo: { tipo: 'porParcela', totalCentavos: 120000, valorCentavos: 1 } }, { ...m, referencias: { categoriaId: 'other' } }]) expect(conferirCriacaoParcelada({ ...c.comando, criacao }, 'criarSerie__intent').ok).toBe(false)
  expect(normalizarCriacaoParcelada({ descritor: { ...descritor, expectedVersion: 1 }, entrada: entradaParceladaTeste }).ok).toBe(false)
  expect(normalizarCriacaoParcelada({ descritor, entrada: entradaParceladaTeste, uid: 'B' }).ok).toBe(false)
  expect(descritorParceladoValido({ ...descritor, tipo: 'unknown' })).toBe(false)
})
