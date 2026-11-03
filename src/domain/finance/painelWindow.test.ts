import { expect, it } from 'vitest'
import { consolidarJanelaPainel, consolidarJanelaPlanejamento } from './painelWindow'
import { fontesPainel } from './contracts/painel'
import type { ContribuicaoPainel } from './contracts/painel'
import { avancarCompetencia } from './calendar'
import { ler } from './testing.testSupport'

const t = '2026-10-21T12:00:00Z', ctx = { uid: 'A', generation: 1, agora: Date.parse(t) + 1000 }
const snapshot = { uid: 'A', generation: 1, readTime: t, expiresAt: Date.parse(t) + 50 * 60000, contractRevision: 1 as const, hojeFinanceiro: '2026-10-21' }
const q = { contractVersion: 1 as const, base: 'planejamento' as const, inicio: '2026-11', fim: '2027-10', modo: '12meses' as const, filtros: {} }
const meses = Array.from({ length: 12 }, (_, i) => ler(avancarCompetencia(q.inicio, i)))
const cobertura = meses.flatMap(competencia => fontesPainel.map(fonte => ({ fonte, competencia, fase: 'dados', estado: 'completa' as const })))
const dados: ContribuicaoPainel[] = meses.map((competencia, i) => ({ chave: `parcelaExterna:s__p${String(i + 1).padStart(2, '0')}`, autoridade: 'parcelaExterna', origemId: 's', competencia, dataFinanceira: `${competencia}-17`, base: 'planejamento', natureza: 'saida', valorCentavos: 10000, liquidadoCentavos: i === 0 ? 10000 : 0, estadoObrigacao: 'ativa', estimado: false, fonte: 'persistida', revisao: 1 }))
it('consolida doze meses consecutivos com o mesmo instante, conservando a obrigação paga', () => {
  const out = ler(consolidarJanelaPlanejamento(q, snapshot, dados, cobertura, ctx))
  expect(out.completo).toBe(true)
  expect(out.meses.map(m => m.competencia)).toEqual(meses)
  expect(out.meses.every(m => m.indicadores.compromissos.estado === 'completo' && m.indicadores.compromissos.valorCentavos === 10000 && m.indicadores.compromissos.readTime === t)).toBe(true)
  expect(out.meses[0].indicadores.pendente).toMatchObject({ valorCentavos: 0 })
})
it('mês incompleto não vira zero completo nem contamina os demais meses', () => {
  const out = ler(consolidarJanelaPlanejamento(q, snapshot, dados, cobertura.filter(c => c.competencia !== '2027-02'), ctx))
  expect(out.completo).toBe(false)
  expect(out.meses[3].indicadores.compromissos).toMatchObject({ estado: 'parcial', subtotalCentavos: 10000 })
  expect(out.meses[3].indicadores.resultadoPrevisto).toMatchObject({ estado: 'indisponivel' })
  expect(out.meses[4].indicadores.compromissos.estado).toBe('completo')
})
it('recusa duplicidade divergente entre meses, intervalo treze e snapshot alheio', () => {
  expect(consolidarJanelaPlanejamento(q, snapshot, [...dados, { ...dados[0], competencia: '2027-01' }], cobertura, ctx).ok).toBe(false)
  expect(consolidarJanelaPlanejamento({ ...q, fim: '2027-11' }, snapshot, dados, cobertura, ctx).ok).toBe(false)
  expect(consolidarJanelaPlanejamento(q, { ...snapshot, uid: 'B' }, dados, cobertura, ctx).ok).toBe(false)
})
it('doze meses também mantêm caixa separado sem criar saldo bancário', () => {
  const consulta = { ...q, base: 'caixa' as const }
  const out = ler(consolidarJanelaPainel(consulta, snapshot, [], cobertura.filter(c => c.fonte !== 'calendarios' && c.fonte !== 'compras'), ctx))
  expect(out.meses).toHaveLength(12)
  expect(out.completo).toBe(true)
  expect(out.meses.every(m => m.base === 'caixa' && m.indicadores.entradasCaixa.estado === 'completo')).toBe(true)
  expect(out.meses[0].indicadores.saldoBancario.estado).toBe('indisponivel')
})
