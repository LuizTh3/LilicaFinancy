import { expect, it } from 'vitest'
import { consolidarMovimentosPainel } from './painelBases'
import { fontesNecessariasPainel } from './contracts/painel'
import type { BasePainel, ContribuicaoPainel } from './contracts/painel'
import { ler } from './testing.testSupport'
const t = '2026-10-21T12:00:00Z', ctx = { uid: 'A', generation: 1, agora: Date.parse(t) + 1000 }
const snapshot = { uid: 'A', generation: 1, readTime: t, expiresAt: Date.parse(t) + 3000000, contractRevision: 1 as const, hojeFinanceiro: '2026-10-21' }
const consulta = (base: BasePainel) => ({ contractVersion: 1 as const, base, inicio: '2026-10', fim: '2026-10', modo: 'mensal' as const, filtros: {} })
const cobertura = (base: BasePainel) => fontesNecessariasPainel(base).map(fonte => ({ fonte, competencia: '2026-10', fase: 'dados', estado: 'completa' as const }))
const linha = (base: BasePainel, autoridade: ContribuicaoPainel['autoridade'], id: string, natureza: 'entrada' | 'saida', valorCentavos: number): ContribuicaoPainel => ({ chave: `${autoridade}:${id}`, autoridade, origemId: id, competencia: '2026-10', dataFinanceira: '2026-10-20', base, natureza, valorCentavos, estimado: false, fonte: 'persistida', revisao: 1 })
it('caixa soma somente fatos por data efetiva e exclui transferências, faturas e compras', () => {
  const dados = [linha('caixa', 'fato', 'income', 'entrada', 50000), linha('caixa', 'fato', 'pay', 'saida', 15000), linha('caixa', 'fato', 'refund', 'entrada', 2000), linha('caixa', 'transferencia', 'own', 'entrada', 99999), linha('caixa', 'compra', 'buy', 'saida', 120000), linha('caixa', 'fatura', 'bill', 'saida', 40000)]
  const r = ler(consolidarMovimentosPainel(consulta('caixa'), snapshot, dados, cobertura('caixa'), ctx))
  expect(r.indicadores).toMatchObject({ entradasCaixa: { valorCentavos: 52000 }, saidasCaixa: { valorCentavos: 15000 }, variacaoCaixa: { resultado: { natureza: 'superavit', magnitudeCentavos: 37000 } } })
  expect(r.indicadores.saldoBancario).toMatchObject({ estado: 'indisponivel', motivo: 'prerequisitosSaldoAusentes' })
})
it('consumo considera compra integral uma vez e efeitos, sem parcelas ou capital de empréstimo', () => {
  const compra = linha('consumo', 'compra', 'buy', 'saida', 120000)
  const r = ler(consolidarMovimentosPainel(consulta('consumo'), snapshot, [compra, compra, linha('consumo', 'efeito008', 'fix', 'entrada', 2000), linha('consumo', 'parcelaCartao', 'part', 'saida', 40000), linha('consumo', 'serieExterna', 'loan', 'saida', 999999)], cobertura('consumo'), ctx))
  expect(r.indicadores).toMatchObject({ despesasConsumo: { valorCentavos: 120000 }, reducoesConsumo: { valorCentavos: 2000 }, consumoLiquido: { resultado: { natureza: 'superavit', magnitudeCentavos: 118000 } } })
})
it('fonte incompleta não fornece resultado integral e rejeita data em outro mês ou caixa virtual', () => {
  const f = linha('caixa', 'fato', 'pay', 'saida', 100)
  expect(consolidarMovimentosPainel(consulta('caixa'), snapshot, [f], [], ctx)).toMatchObject({ valor: { indicadores: { saidasCaixa: { estado: 'parcial', subtotalCentavos: 100 }, variacaoCaixa: { estado: 'indisponivel' } } } })
  for (const patch of [{ dataFinanceira: '2026-11-01' }, { fonte: 'virtual' as const }, { estimado: true }]) expect(consolidarMovimentosPainel(consulta('caixa'), snapshot, [{ ...f, ...patch }], cobertura('caixa'), ctx).ok).toBe(false)
  expect(consolidarMovimentosPainel(consulta('caixa'), snapshot, [f, { ...f, valorCentavos: 101 }], cobertura('caixa'), ctx).ok).toBe(false)
})
