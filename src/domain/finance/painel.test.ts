import { expect, it } from 'vitest'
import { consolidarPlanejamento } from './painel'
import { fontesPainel } from './contracts/painel'
import type { ContribuicaoPainel } from './contracts/painel'
const t = '2026-10-20T12:00:00Z'
const snapshot = { uid: 'A', generation: 1, readTime: t, expiresAt: Date.parse(t) + 50 * 60000, contractRevision: 1 as const, hojeFinanceiro: '2026-10-20' }
const ctx = { uid: 'A', generation: 1, agora: Date.parse(t) + 1000 }
const consulta = { contractVersion: 1 as const, base: 'planejamento' as const, inicio: '2026-11', fim: '2026-11', modo: 'mensal' as const, filtros: {} }
const cobertura = fontesPainel.map(fonte => ({ fonte, competencia: '2026-11', fase: 'dados', estado: 'completa' as const }))
function linha(autoridade: ContribuicaoPainel['autoridade'], id: string, valorCentavos: number, liquidadoCentavos = 0, natureza: 'entrada' | 'saida' = 'saida') {
 return { autoridade, chave: autoridade + ':' + id, origemId: id, base: 'planejamento' as const, competencia: '2026-11', dataFinanceira: '2026-12-10', valorCentavos, liquidadoCentavos, natureza, fonte: 'persistida' as const, estimado: false, estadoObrigacao: 'ativa' as const, revisao: 1 }
}
const fixture = () => [linha('externo', 'salario', 500000, 300000, 'entrada'), linha('fatura', 'cartao', 100000, 40000), linha('externo', 'despesa', 20000, 20000), linha('parcelaExterna', 'emprestimo5', 30000)]
it('reconcilia os sete indicadores sem misturar vencimento e competência', () => {
 const r = consolidarPlanejamento(consulta, snapshot, fixture(), cobertura, ctx)
 expect(r).toMatchObject({ ok: true, valor: { indicadores: {
  receitasPrevistas: { estado: 'completo', valorCentavos: 500000 }, recebidoDasReceitas: { valorCentavos: 300000 }, aReceber: { valorCentavos: 200000 },
  compromissos: { valorCentavos: 150000 }, liquidadoDosCompromissos: { valorCentavos: 60000 }, pendente: { valorCentavos: 90000 }, resultadoPrevisto: { resultado: { natureza: 'superavit', magnitudeCentavos: 350000 } },
 } } })
})
it('pagamento adicional muda líquido/pendente, não o planejado nem resultado', () => {
 const data = fixture(); data[1].liquidadoCentavos += 10000
 expect(consolidarPlanejamento(consulta, snapshot, data, cobertura, ctx)).toMatchObject({ valor: { indicadores: { compromissos: { valorCentavos: 150000 }, liquidadoDosCompromissos: { valorCentavos: 70000 }, pendente: { valorCentavos: 80000 }, resultadoPrevisto: { resultado: { magnitudeCentavos: 350000 } } } } })
})
it('compra, parcelas do cartão e valor original da série explicam, sem segunda soma', () => {
 const data = [...fixture(), linha('compra', 'compra', 900000), linha('parcelaCartao', 'parcela', 100000), linha('serieExterna', 'capital', 999999)]
 expect(consolidarPlanejamento(consulta, snapshot, data, cobertura, ctx)).toMatchObject({ valor: { indicadores: { compromissos: { valorCentavos: 150000 } } } })
})
it('cancelada é excluída, quitada permanece e estorno/reversão vêm no estado líquido da origem', () => {
 const data = [...fixture(), { ...linha('externo', 'cancelada', 8000), estadoObrigacao: 'cancelada' as const }]
 data[1] = linha('fatura', 'cartao', 90000, 30000)
 expect(consolidarPlanejamento(consulta, snapshot, data, cobertura, ctx)).toMatchObject({ valor: { indicadores: { compromissos: { valorCentavos: 140000 }, pendente: { valorCentavos: 90000 } } } })
})
it('fonte incompleta e filtros ainda não suportados não geram total definitivo', () => {
 const partial = consolidarPlanejamento(consulta, snapshot, fixture(), cobertura.slice(0, 1), ctx)
 expect(partial).toMatchObject({ ok: true, valor: { indicadores: { compromissos: { estado: 'parcial', subtotalCentavos: 150000 } } } })
 expect(consolidarPlanejamento({ ...consulta, filtros: { categorias: ['alimentacao'] } }, snapshot, fixture(), cobertura, ctx)).toMatchObject({ valor: { indicadores: { resultadoPrevisto: { estado: 'indisponivel', motivo: 'filtroIncompativel' } } } })
})
it('estimativa/virtual é identificada; recebimento não é inferido', () => {
 const data = [ { ...linha('ocorrenciaExterna', 'energia', 15000), fonte: 'virtual' as const, estimado: true } ]
 expect(consolidarPlanejamento(consulta, snapshot, data, cobertura, ctx)).toMatchObject({ valor: { indicadores: { compromissos: { valorCentavos: 15000, estimadoCentavos: 15000 }, liquidadoDosCompromissos: { valorCentavos: 0 } } } })
})
it('zero só é completo com cobertura; sem cobertura é parcial', () => {
 expect(consolidarPlanejamento(consulta, snapshot, [], cobertura, ctx)).toMatchObject({ valor: { indicadores: { compromissos: { estado: 'completo', valorCentavos: 0 } } } })
 expect(consolidarPlanejamento(consulta, snapshot, [], [], ctx)).toMatchObject({ valor: { indicadores: { compromissos: { estado: 'parcial', subtotalCentavos: 0 } } } })
})
it('recusa estouro, líquido excedente, quitação virtual e identidades divergentes', () => {
 for (const data of [
  [linha('externo', 'a', Number.MAX_SAFE_INTEGER), linha('externo', 'b', 1)],
  [linha('externo', 'a', 100, 101)], [{ ...linha('externo', 'a', 100, 1), fonte: 'virtual' as const }],
  [linha('externo', 'a', 100), linha('externo', 'a', 200)],
 ]) expect(consolidarPlanejamento(consulta, snapshot, data, cobertura, ctx).ok).toBe(false)
 expect(consolidarPlanejamento(consulta, { ...snapshot, uid: 'B' }, fixture(), cobertura, ctx).ok).toBe(false)
})
