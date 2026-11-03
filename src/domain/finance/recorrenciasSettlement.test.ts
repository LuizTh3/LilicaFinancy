import { expect, it } from 'vitest'
import { planejarLiquidacaoRecorrente, planejarReversaoRecorrente } from './recorrenciasSettlement'
import { prepararCadastroRecorrente, prepararGeracaoRecorrente } from './recorrencias'
import { ler } from './testing.testSupport'

const gerar = (natureza = 'despesaExterna', estimado = false) => {
  const c = ler(prepararCadastroRecorrente({ natureza, inicio: '2026-10-01', descricao: 'Mensal', diaAncora: 15, estimado, valorCentavos: 10000, categoriaId: 'cat' }, { uid: 'A', serieId: 'serie' }))
  const g = ler(prepararGeracaoRecorrente({ contexto: { uid: 'A', inicioMes: '2026-10', fimMes: '2026-10', base: 'planejamento', seriesCompletas: true, persistidasCompletas: true }, series: [c.serie], revisoes: [c.revisao], persistidas: [], ausenciasConfirmadas: ['r10-serie-202610'], destinosCartao: [] }))
  return { serie: g.series[0], ocorrencia: g.novas[0] }
}
const ctx = { uid: 'A', hoje: '2026-10-21', historicoCompleto: true, fatos: [], contas: [{ uid: 'A', id: 'account', estadoCadastro: 'ativo' as const }] }
const cmd = { operationKey: 'pay', expectedVersionSerie: 2, expectedVersionOcorrencia: 1, valorCentavos: 4000, contaId: 'account', dataEfetiva: '2026-10-20' }
it('paga4000+6000 sem remover a obrigação planejada e recusa excesso', () => {
  const base = gerar(), r = ler(planejarLiquidacaoRecorrente(base.serie, base.ocorrencia, cmd, ctx))
  expect(r.fato).toMatchObject({ tipo: 'pagamento', valorCentavos: 4000 })
  expect(r.ocorrencia.financeiro).toMatchObject({ valorCentavos: 10000, liquidadoLiquidoCentavos: 4000, jaLiquidada: true })
  const c = { ...ctx, fatos: [r.fato] }
  expect(planejarLiquidacaoRecorrente(r.serie, r.ocorrencia, { ...cmd, operationKey: 'over', expectedVersionSerie: 3, expectedVersionOcorrencia: 2, valorCentavos: 6001 }, c).ok).toBe(false)
  const r2 = ler(planejarLiquidacaoRecorrente(r.serie, r.ocorrencia, { ...cmd, operationKey: 'rest', expectedVersionSerie: 3, expectedVersionOcorrencia: 2, valorCentavos: 6000 }, c))
  expect(r2.ocorrencia.financeiro).toMatchObject({ liquidadoLiquidoCentavos: 10000 })
})
it('receita gera recebimento explícito, estimativa e histórico incompleto não liquidam', () => {
  const income = gerar('receitaExterna'), r = ler(planejarLiquidacaoRecorrente(income.serie, income.ocorrencia, cmd, ctx))
  expect(r.fato.tipo).toBe('recebimento')
  const estimated = gerar('despesaExterna', true)
  expect(planejarLiquidacaoRecorrente(estimated.serie, estimated.ocorrencia, cmd, ctx).ok).toBe(false)
  expect(planejarLiquidacaoRecorrente(income.serie, income.ocorrencia, cmd, { ...ctx, historicoCompleto: false }).ok).toBe(false)
  expect(planejarLiquidacaoRecorrente(income.serie, income.ocorrencia, { ...cmd, dataEfetiva: '2026-10-22' }, ctx).ok).toBe(false)
})
it('reverte integralmente na conta/data originais, mantém histórico e impede segunda reversão', () => {
  const base = gerar(), pago = ler(planejarLiquidacaoRecorrente(base.serie, base.ocorrencia, cmd, ctx))
  const c = { ...ctx, fatos: [pago.fato], contas: [{ ...ctx.contas[0], estadoCadastro: 'arquivado' as const }] }
  const reverse = { operationKey: 'reverse', expectedVersionSerie: 3, expectedVersionOcorrencia: 2, originalId: pago.fato.id, motivo: 'Erro de lançamento' }
  const r = ler(planejarReversaoRecorrente(pago.serie, pago.ocorrencia, reverse, c))
  expect(r.fato).toMatchObject({ tipo: 'reversaoPagamento', valorCentavos: 4000, contaId: 'account', dataEfetiva: '2026-10-20' })
  expect(r.ocorrencia.financeiro).toMatchObject({ liquidadoLiquidoCentavos: 0, jaLiquidada: true })
  expect(planejarReversaoRecorrente(r.serie, r.ocorrencia, { ...reverse, operationKey: 'again', expectedVersionSerie: 4, expectedVersionOcorrencia: 3 }, { ...c, fatos: [...c.fatos, r.fato] }).ok).toBe(false)
})
