import { expect, it } from 'vitest'
import { resumirSerieParcelada } from './parceladosSummary'
import { serieParceladaTeste } from './parcelados.testSupport'
import { ler } from './testing.testSupport'
it('5/10 mostra seis obrigações e quatro posições desconhecidas sem original fictício', () => {
  const r = ler(resumirSerieParcelada(serieParceladaTeste(), { uid: 'A', hoje: '2026-11-01' }))
  expect(r.linhas).toHaveLength(6)
  expect(r.anterioresNaoCadastradas).toBe(4)
  expect('valorOriginalCentavos' in r).toBe(false)
  expect(r).toMatchObject({ planejadoAtivoCentavos: 120000, pendenteCentavos: 120000, liquidadoLiquidoCentavos: 0 })
  expect(r.linhas[0].atrasada).toBe(true)
})
it('pagamento conserva planejamento, cancelamento retira exigibilidade e UID distinto falha', () => {
  const s = serieParceladaTeste(), pago = { ...s, version: 2, parcelas: { ...s.parcelas, p05: { ...s.parcelas.p05, jaLiquidada: true, liquidadoLiquidoCentavos: 20000 }, p06: { ...s.parcelas.p06, estadoObrigacao: 'cancelada', canceledAt: 1000, cancelamentoMotivo: 'Cancelada' } } }
  const r = ler(resumirSerieParcelada(pago, { uid: 'A', hoje: '2026-11-01' }))
  expect(r).toMatchObject({ planejadoAtivoCentavos: 100000, liquidadoLiquidoCentavos: 20000, pendenteCentavos: 80000 })
  expect(r.linhas[0].situacao).toBe('liquidada')
  expect(r.linhas[1].situacao).toBe('cancelada')
  expect(resumirSerieParcelada(pago, { uid: 'B', hoje: '2026-11-01' }).ok).toBe(false)
})
