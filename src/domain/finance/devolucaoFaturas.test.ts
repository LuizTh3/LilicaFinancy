import { expect, it } from 'vitest'
import { planejarDevolucaoFatura } from './devolucaoFaturas'
import { criarCapacidadeItem } from './itemCapacity'
import { inicializarControleFatura, planejarPagamentoFatura } from './liquidacoesFaturas'
import { calendarioBaseFatura } from './invoiceCalendar'
import { ler } from './testing.testSupport'

const ctx = { uid: 'A', hoje: '2026-11-18', instante: 3000, calendario: ler(calendarioBaseFatura('2026-11', 10, 17)), conta: { uid: 'A', id: 'other', estadoCadastro: 'ativo' as const } }
const base = () => ler(inicializarControleFatura({ uid: 'A', faturaId: 'card__2026-11', cartaoId: 'card', competencia: '2026-11', exigivelCentavos: 100000, eventoId: 'criarCompra__buy', origemId: 'buy', instante: 1000 }))
const itens = () => [{ uid: 'A', id: 'buy__r1__n1', faturaId: 'card__2026-11', estadoObrigacao: 'ativa', capacidade: ler(criarCapacidadeItem(100000, 'cat')) }]
const cmd = { operationKey: 'return', expectedVersion: 1, motivo: 'Devolução real', dataEfeito: '2026-11-18', valorCentavos: 20000, distribuicaoItens: [{ itemId: 'buy__r1__n1', valorCentavos: 20000 }], destino: { tipo: 'fatura' } }
it('abate pendência e consumo sem criar caixa ou mudar o original', () => {
  const r = ler(planejarDevolucaoFatura(base(), itens(), [], cmd, ctx))
  expect(r.controle).toMatchObject({ exigivelCentavos: 80000, liquidadoLiquidoCentavos: 0 })
  expect(r.itens[0].capacidade.devolvidoCentavos).toBe(20000)
  expect(r.fatos).toEqual([])
  expect(r.estornos[0]).toMatchObject({ valorCentavos: 20000, dataEfeito: '2026-11-18' })
})
it('reembolsa fatura paga em conta distinta com capacidade vinculada ao pagamento', () => {
  const p = ler(planejarPagamentoFatura(base(), { operationKey: 'pay', expectedVersion: 1, valorCentavos: 100000, contaId: 'payer', dataEfetiva: '2026-11-17' }, { ...ctx, instante: 2000, conta: { ...ctx.conta, id: 'payer' } }))
  const pagamentos = [{ original: p.fato, reembolsadoCentavos: 0, revertido: false }]
  const comando = { ...cmd, expectedVersion: 2, destino: { tipo: 'conta', contaId: 'other', dataRecebida: '2026-11-18', distribuicaoPagamentos: [{ pagamentoId: p.fato.id, valorCentavos: 20000 }] } }
  const r = ler(planejarDevolucaoFatura(p.controle, itens(), pagamentos, comando, ctx))
  expect(r.controle).toMatchObject({ exigivelCentavos: 80000, liquidadoLiquidoCentavos: 80000, possuiHistoricoPagamento: true })
  expect(r.fatos[0]).toMatchObject({ tipo: 'reembolso', contaId: 'other', originalId: p.fato.id, valorCentavos: 20000, dataEfetiva: '2026-11-18' })
  expect(r.pagamentos[0].reembolsadoCentavos).toBe(20000)
  expect(planejarDevolucaoFatura(p.controle, itens(), [{ ...pagamentos[0], revertido: true }], comando, ctx).ok).toBe(false)
  expect(planejarDevolucaoFatura(p.controle, itens(), pagamentos, { ...comando, destino: { ...comando.destino, dataRecebida: '2026-11-16' } }, ctx).ok).toBe(false)
  expect(planejarDevolucaoFatura(p.controle, itens(), pagamentos, { ...cmd, expectedVersion: 2 }, ctx).ok).toBe(false)
})
it('nega soma divergente, distribuição duplicada, capacidade excedida e item cancelado', () => {
  for (const patch of [{ valorCentavos: 20001 }, { distribuicaoItens: [...cmd.distribuicaoItens, ...cmd.distribuicaoItens] }, { dataEfeito: '2026-11-19' }, { contaId: 'hidden' }]) expect(planejarDevolucaoFatura(base(), itens(), [], { ...cmd, ...patch }, ctx).ok).toBe(false)
  expect(planejarDevolucaoFatura(base(), [{ ...itens()[0], estadoObrigacao: 'cancelada' }], [], cmd, ctx).ok).toBe(false)
  expect(planejarDevolucaoFatura(base(), [{ ...itens()[0], capacidade: { ...itens()[0].capacidade, devolvidoCentavos: 90000 } }], [], cmd, ctx).ok).toBe(false)
})
