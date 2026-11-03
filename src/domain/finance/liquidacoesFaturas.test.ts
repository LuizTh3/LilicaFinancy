import { expect, it } from 'vitest'
import { inicializarControleFatura, planejarPagamentoFatura, planejarReversaoPagamentoFatura, resumirControleFatura, validarControleFatura, planejarEncargoFatura } from './liquidacoesFaturas'
import { calendarioBaseFatura } from './invoiceCalendar'
import { ler } from './testing.testSupport'

const calendario = ler(calendarioBaseFatura('2026-11', 10, 17))
const ctx = { uid: 'A', hoje: '2026-11-18', instante: 2000, calendario, conta: { id: 'account', uid: 'A', estadoCadastro: 'ativo' as const } }
const controle = () => ler(inicializarControleFatura({ uid: 'A', faturaId: 'card__2026-11', cartaoId: 'card', competencia: '2026-11', exigivelCentavos: 100000, eventoId: 'criarCompra__intent', origemId: 'buy', instante: 1000 }))
const pagamento = { operationKey: 'pay', expectedVersion: 1, valorCentavos: 40000, contaId: 'account', dataEfetiva: '2026-11-18' }
it('paga400+600, sem reduzir o compromisso planejado nem quitar parcela isolada', () => {
  const c = controle(), first = ler(planejarPagamentoFatura(c, pagamento, ctx))
  expect(ler(resumirControleFatura(first.controle, ctx))).toMatchObject({ exigivelCentavos: 100000, liquidadoLiquidoCentavos: 40000, pendenteCentavos: 60000, atrasada: true })
  const second = ler(planejarPagamentoFatura(first.controle, { ...pagamento, operationKey: 'pay2', expectedVersion: 2, valorCentavos: 60000 }, { ...ctx, instante: 3000 }))
  expect(ler(resumirControleFatura(second.controle, ctx))).toMatchObject({ exigivelCentavos: 100000, pendenteCentavos: 0, atrasada: false })
  expect(second.fato.alvo).toEqual({ tipo: 'fatura', id: 'card__2026-11' })
  expect(c.liquidadoLiquidoCentavos).toBe(0)
})
it('excesso, data futura, conta alheia/arquivada, legado e versão obsoleta falham fechados', () => {
  for (const patch of [{ valorCentavos: 100001 }, { expectedVersion: 2 }, { dataEfetiva: '2026-11-19' }, { contaId: 'other' }, { parcelaId: 'buy__r1__n1' }]) expect(planejarPagamentoFatura(controle(), { ...pagamento, ...patch }, ctx).ok).toBe(false)
  expect(planejarPagamentoFatura(controle(), pagamento, { ...ctx, conta: { ...ctx.conta, estadoCadastro: 'arquivado' } }).ok).toBe(false)
  expect(planejarPagamentoFatura(controle(), pagamento, { ...ctx, uid: 'B' }).ok).toBe(false)
  expect(validarControleFatura(undefined).ok).toBe(false)
})
it('reversão é integral única, herda conta/data e não limpa histórico de pagamento', () => {
  const pago = ler(planejarPagamentoFatura(controle(), pagamento, ctx))
  const reverse = { operationKey: 'reverse', expectedVersion: 2, motivo: 'Erro', original: pago.fato, marcadorAusente: true, capacidadeOriginal: { uid: 'A', faturaId: 'card__2026-11', pagamentoId: pago.fato.id, valorOriginalCentavos: 40000, reembolsadoCentavos: 0, revertido: false } }
  const r = ler(planejarReversaoPagamentoFatura(pago.controle, reverse, { ...ctx, instante: 3000, conta: { ...ctx.conta, estadoCadastro: 'arquivado' } }))
  expect(r.controle).toMatchObject({ liquidadoLiquidoCentavos: 0, possuiHistoricoPagamento: true })
  expect(r.fato).toMatchObject({ tipo: 'reversaoPagamento', dataEfetiva: pago.fato.dataEfetiva, contaId: pago.fato.contaId, valorCentavos: pago.fato.valorCentavos })
  expect(planejarReversaoPagamentoFatura(r.controle, { ...reverse, operationKey: 'again', expectedVersion: 3, marcadorAusente: false }, ctx).ok).toBe(false)
  expect(planejarReversaoPagamentoFatura(pago.controle, { ...reverse, capacidadeOriginal: { ...reverse.capacidadeOriginal, reembolsadoCentavos: 1 } }, { ...ctx, instante: 3000 }).ok).toBe(false)
  expect(planejarReversaoPagamentoFatura(pago.controle, { ...reverse, capacidadeOriginal: undefined }, { ...ctx, instante: 3000 }).ok).toBe(false)
})
it('encargo manual aumenta obrigação sem juros inferidos ou movimento de caixa', () => {
  const r = ler(planejarEncargoFatura(controle(), { operationKey: 'fee', expectedVersion: 1, valorCentavos: 1500, categoriaId: 'fees', descricao: 'Encargo informado', tipoJurosOuEncargo: 'encargo', motivo: 'Valor informado na fatura', dataEfeito: '2026-11-18' }, ctx))
  expect(r.controle.exigivelCentavos).toBe(101500)
  expect(r.item.valorCentavos).toBe(1500)
  expect('fato' in r).toBe(false)
  expect('taxa' in r).toBe(false)
})
it('controle fechado rejeita saldo impossível, reset de histórico e campos extras', () => {
  const c = controle()
  for (const patch of [{ liquidadoLiquidoCentavos: 1 }, { liquidadoLiquidoCentavos: 100001, possuiHistoricoPagamento: true }, { pendenteCentavos: 100000 }, { schemaVersion: 1 }, { faturaId: 'other__2026-11' }, { version: 0 }]) expect(validarControleFatura({ ...c, ...patch }).ok).toBe(false)
})
