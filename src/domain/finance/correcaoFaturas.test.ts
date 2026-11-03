import { expect, it } from 'vitest'
import { planejarCorrecaoItemFatura } from './correcaoFaturas'
import { criarCapacidadeItem } from './itemCapacity'
import { calendarioBaseFatura } from './invoiceCalendar'
import { inicializarControleFatura } from './liquidacoesFaturas'
import { ler } from './testing.testSupport'

const ctx = { uid: 'A', hoje: '2026-11-18', instante: 2000, calendario: ler(calendarioBaseFatura('2026-11', 10, 17)) }
const controle = () => ler(inicializarControleFatura({ uid: 'A', faturaId: 'card__2026-11', cartaoId: 'card', competencia: '2026-11', exigivelCentavos: 10000, eventoId: 'criarCompra__buy', origemId: 'buy', instante: 1000 }))
const item = () => ({ uid: 'A', id: 'buy__r1__n1', faturaId: 'card__2026-11', dataOrigem: '2026-10-15', capacidade: ler(criarCapacidadeItem(10000, 'food')) })
const comando = { operationKey: 'fix', expectedVersion: 1, motivo: 'Valor digitado incorretamente', dataRegistroFinanceira: '2026-11-18', variante: 'monetaria', sentido: 'reducao', valorCentavos: 2000 }

it('corrige100→80 no consumo original sem caixa ou alteração do original', () => {
  const original = item(), c = controle()
  const r = ler(planejarCorrecaoItemFatura(c, original, comando, ctx))
  expect(r.controle).toMatchObject({ exigivelCentavos: 8000, liquidadoLiquidoCentavos: 0, version: 2 })
  expect(r.item.capacidade).toMatchObject({ valorOriginalCentavos: 10000, correcaoReducoesCentavos: 2000 })
  expect(r.efeito).toMatchObject({ competenciaConsumo: '2026-10', deltaCentavos: -2000, tipo: 'correcaoMonetaria' })
  expect('fato' in r).toBe(false)
  expect(original.capacidade.correcaoReducoesCentavos).toBe(0)
})
it('reclassifica sem alterar dinheiro e rejeita classificação idêntica', () => {
  const cmd = { operationKey: 'class', expectedVersion: 1, motivo: 'Categoria incorreta', dataRegistroFinanceira: ctx.hoje, variante: 'classificacao', categoriaId: 'health' }
  const r = ler(planejarCorrecaoItemFatura(controle(), item(), cmd, ctx))
  expect(r.controle.exigivelCentavos).toBe(10000)
  expect(r.item.capacidade.categoriaEfetivaId).toBe('health')
  expect(r.efeito).toMatchObject({ categoriaAnteriorId: 'food', categoriaNovaId: 'health', deltaCentavos: 0 })
  expect(planejarCorrecaoItemFatura(controle(), item(), { ...cmd, categoriaId: 'food' }, ctx).ok).toBe(false)
})
it('recusa crédito implícito, capacidade devolvida, versão obsoleta e referências divergentes', () => {
  const c = { ...controle(), liquidadoLiquidoCentavos: 9000, possuiHistoricoPagamento: true }
  expect(planejarCorrecaoItemFatura(c, item(), comando, ctx).ok).toBe(false)
  const devolvido = { ...item(), capacidade: { ...item().capacidade, devolvidoCentavos: 9000 } }
  expect(planejarCorrecaoItemFatura(controle(), devolvido, comando, ctx).ok).toBe(false)
  for (const patch of [{ expectedVersion: 2 }, { dataRegistroFinanceira: '2026-11-19' }, { taxa: 2 }, { valorCentavos: 0 }]) expect(planejarCorrecaoItemFatura(controle(), item(), { ...comando, ...patch }, ctx).ok).toBe(false)
  expect(planejarCorrecaoItemFatura(controle(), { ...item(), uid: 'B' }, comando, ctx).ok).toBe(false)
  expect(planejarCorrecaoItemFatura(controle(), { ...item(), faturaId: 'other__2026-11' }, comando, ctx).ok).toBe(false)
})
