import { expect, it } from 'vitest'
import { situacaoFatura } from './faturaSituacao'
import { inicializarControleFatura, planejarRevisaoFatura, planejarPagamentoFatura } from './liquidacoesFaturas'
import { calendarioBaseFatura } from './invoiceCalendar'
import { ler } from './testing.testSupport'

const calendario = ler(calendarioBaseFatura('2026-11', 10, 17))
const novo = (valor = 10000) => ler(inicializarControleFatura({ uid: 'A', faturaId: 'card__2026-11', cartaoId: 'card', competencia: '2026-11', exigivelCentavos: valor, eventoId: 'criarCompra__intent', origemId: 'buy', instante: 1000 }))
const ctx = { uid: 'A', hoje: '2026-11-18', instante: 2000, calendario }
it('separa ciclo, vencimento, histórico e exigibilidade sem inferir pagamento', () => {
  const c = novo()
  expect(ler(situacaoFatura(c, { ...ctx, hoje: '2026-11-09' }))).toMatchObject({ ciclo: 'aberta', atrasada: false, estadoLiquidacao: 'pendente' })
  expect(ler(situacaoFatura(c, { ...ctx, hoje: '2026-11-10' }))).toMatchObject({ ciclo: 'fechada', atrasada: false })
  expect(ler(situacaoFatura(c, { ...ctx, hoje: '2026-11-17' }))).toMatchObject({ atrasada: false })
  expect(ler(situacaoFatura(c, ctx))).toMatchObject({ atrasada: true })
  expect(ler(situacaoFatura(novo(0), ctx))).toMatchObject({ estadoLiquidacao: 'semExigibilidade', possuiHistoricoPagamento: false, atrasada: false })
})
it('revisão é explícita, só em fechada sem histórico e bloqueia pagamento até encerrar', () => {
  const cmd = { tipo: 'reabrirFatura', operationKey: 'review', expectedVersion: 1, motivo: 'Conferir itens' }
  expect(planejarRevisaoFatura(novo(), cmd, { ...ctx, hoje: '2026-11-09' }).ok).toBe(false)
  const aberta = ler(planejarRevisaoFatura(novo(), cmd, ctx))
  expect(aberta).toMatchObject({ version: 2, revisaoEstado: 'reaberta', revisaoEventoId: 'reabrirFatura__review' })
  const payment = { operationKey: 'pay', expectedVersion: 2, valorCentavos: 1000, contaId: 'account', dataEfetiva: ctx.hoje }
  const conta = { id: 'account', uid: 'A', estadoCadastro: 'ativo' as const }
  expect(planejarPagamentoFatura(aberta, payment, { ...ctx, conta }).ok).toBe(false)
  const fechada = ler(planejarRevisaoFatura(aberta, { tipo: 'encerrarRevisao', operationKey: 'end', expectedVersion: 2, motivo: 'Conferência concluída' }, { ...ctx, instante: 3000 }))
  expect(fechada).toMatchObject({ revisaoEstado: 'normal', version: 3, exigivelCentavos: 10000 })
  expect('revisaoEventoId' in fechada).toBe(false)
  expect(planejarRevisaoFatura({ ...fechada, possuiHistoricoPagamento: true }, { ...cmd, expectedVersion: 3 }, { ...ctx, instante: 4000 }).ok).toBe(false)
})
