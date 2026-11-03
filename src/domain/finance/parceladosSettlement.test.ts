import { expect, it } from 'vitest'
import { planejarPagamentoParcela, planejarReversaoParcela, resumoParcelaExterna } from './parceladosSettlement'
import { serieParceladaTeste } from './parcelados.testSupport'
import { ler } from './testing.testSupport'
import type { ContextoLiquidacaoParcelada } from './parceladosSettlement'

const contexto: ContextoLiquidacaoParcelada = { uid: 'A', hoje: '2026-10-21', instante: 2000, historicoCompleto: true, contas: [{ id: 'account', uid: 'A', estadoCadastro: 'ativo' }], fatos: [] }
const comando = { operationKey: 'pay', serieId: 'serie', numero: 5, expectedVersion: 1, valorCentavos: 6000, contaId: 'account', dataEfetiva: '2026-10-21' }
it('paga 60 e 140 de obrigação200, preservando compromissos e posições restantes', () => {
  const inicial = serieParceladaTeste(), antes = JSON.stringify(inicial)
  const parcial = ler(planejarPagamentoParcela(inicial, comando, contexto))
  expect(parcial.serie.parcelas.p05).toMatchObject({ valorCentavos: 20000, liquidadoLiquidoCentavos: 6000, jaLiquidada: true })
  expect(parcial.fato).toMatchObject({ tipo: 'pagamento', alvo: { tipo: 'parcelaExterna', id: 'serie__p05' }, valorCentavos: 6000 })
  const final = ler(planejarPagamentoParcela(parcial.serie, { ...comando, operationKey: 'pay2', expectedVersion: 2, valorCentavos: 14000 }, { ...contexto, instante: 3000, fatos: [parcial.fato] }))
  expect(final.serie.version).toBe(3)
  expect(ler(resumoParcelaExterna(final.serie, 5, { ...contexto, fatos: [parcial.fato, final.fato] })).pendenteCentavos).toBe(0)
  expect(final.serie.parcelas.p06).toEqual(inicial.parcelas.p06)
  expect(JSON.stringify(inicial)).toBe(antes)
})
it('rejeita excesso, data futura, conta arquivada/alheia, versão obsoleta e auditoria incompleta', () => {
  const s = serieParceladaTeste()
  for (const patch of [{ valorCentavos: 20001 }, { dataEfetiva: '2026-10-22' }, { expectedVersion: 2 }, { numero: 4 }, { serieId: 'other' }, { contaId: 'other' }, { entradaCentavos: 5 }]) expect(planejarPagamentoParcela(s, { ...comando, ...patch }, contexto).ok).toBe(false)
  for (const ctx of [{ ...contexto, uid: 'B' }, { ...contexto, historicoCompleto: false }, { ...contexto, contas: [{ id: 'account', uid: 'B', estadoCadastro: 'ativo' as const }] }, { ...contexto, contas: [{ id: 'account', uid: 'A', estadoCadastro: 'arquivado' as const }] }]) expect(planejarPagamentoParcela(s, comando, ctx).ok).toBe(false)
})
it('reverte erro integral uma única vez, com conta/data originais e histórico monotônico', () => {
  const pago = ler(planejarPagamentoParcela(serieParceladaTeste(), comando, contexto))
  const rev = { operationKey: 'reverse', serieId: 'serie', numero: 5, expectedVersion: 2, originalEventoId: pago.fato.id, motivo: 'Erro de registro' }
  const ctx = { ...contexto, instante: 3000, fatos: [pago.fato], contas: [{ ...contexto.contas[0], estadoCadastro: 'arquivado' as const }] }
  const volta = ler(planejarReversaoParcela(pago.serie, rev, ctx))
  expect(volta.serie.parcelas.p05).toMatchObject({ liquidadoLiquidoCentavos: 0, jaLiquidada: true, valorCentavos: 20000 })
  expect(volta.fato).toMatchObject({ tipo: 'reversaoPagamento', contaId: pago.fato.contaId, dataEfetiva: pago.fato.dataEfetiva, valorCentavos: 6000 })
  expect(volta.marcador.originalEventoId).toBe(pago.fato.id)
  expect(planejarReversaoParcela(volta.serie, { ...rev, expectedVersion: 3, operationKey: 'again' }, { ...ctx, fatos: [pago.fato, volta.fato] }).ok).toBe(false)
})
it('reconciliação rejeita controle divergente e história faltante', () => {
  const pago = ler(planejarPagamentoParcela(serieParceladaTeste(), comando, contexto))
  expect(resumoParcelaExterna(pago.serie, 5, contexto).ok).toBe(false)
  expect(resumoParcelaExterna(pago.serie, 5, { ...contexto, fatos: [pago.fato] }).ok).toBe(true)
})
it('mutação não retrocede o instante técnico e histórico futuro não é reconciliado', () => {
  const pago = ler(planejarPagamentoParcela(serieParceladaTeste(), comando, contexto))
  expect(planejarPagamentoParcela(pago.serie, { ...comando, operationKey: 'next', expectedVersion: 2, valorCentavos: 100 }, { ...contexto, instante: 1999, fatos: [pago.fato] }).ok).toBe(false)
  expect(resumoParcelaExterna(pago.serie, 5, { ...contexto, fatos: [{ ...pago.fato, dataEfetiva: '2026-10-22' }] }).ok).toBe(false)
})
