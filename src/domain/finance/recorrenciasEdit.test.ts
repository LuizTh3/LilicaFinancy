import { expect, it } from 'vitest'
import { prepararRevisaoFuturasRecorrente } from './recorrenciasEdit'
import { prepararCadastroRecorrente, prepararGeracaoRecorrente } from './recorrencias'
import { ler } from './testing.testSupport'

const cadastro = () => ler(prepararCadastroRecorrente({ natureza: 'despesaExterna', inicio: '2026-10-01', descricao: 'Conta', diaAncora: 31, estimado: true, valorCentavos: 10000, categoriaId: 'cat' }, { uid: 'A', serieId: 'serie' }))
const entrada = () => {
  const c = cadastro(), revisoes = [{ ...c.revisao, fimExclusivo: '2027-01' }, { ...c.revisao, id: 'serie-202701', inicioMes: '2027-01', valorCentavos: 30000 }]
  const g = ler(prepararGeracaoRecorrente({ contexto: { uid: 'A', inicioMes: '2026-10', fimMes: '2026-12', base: 'planejamento', seriesCompletas: true, persistidasCompletas: true }, series: [c.serie], revisoes, persistidas: [], ausenciasConfirmadas: ['r10-serie-202610', 'r10-serie-202611', 'r10-serie-202612'], destinosCartao: [] }))
  return { serie: g.series[0], revisoes, persistidas: g.novas, ausenciasConfirmadas: [], ultimoMesMaterializado: '2026-12' }
}
const comando = { expectedVersionSerie: 2, vigenciaMes: '2026-11', alteracoes: { valorCentavos: 20000, diaAncora: 15 } }
const ctx = { uid: 'A', hoje: '2026-10-21' }
it('divide segmento vigente e preserva passado virtual e próxima revisão agendada', () => {
  const input = entrada(), r = ler(prepararRevisaoFuturasRecorrente(input, comando, ctx))
  expect(r.revisoes.map(v => [v.inicioMes, v.fimExclusivo, v.valorCentavos])).toEqual([['2026-10', '2026-11', 10000], ['2026-11', '2027-01', 20000], ['2027-01', undefined, 30000]])
  expect(r.ocorrenciasAlteradas.map(o => o.financeiro && 'vencimento' in o.financeiro ? o.financeiro.vencimento : '')).toEqual(['2026-11-15', '2026-12-15'])
  expect(input.persistidas[0].financeiro?.valorCentavos).toBe(10000)
})
it('preserva liquidadas e exceções e ainda exige todos os slots ausentes do intervalo', () => {
  const input = entrada(), nov = input.persistidas[1]
  const protegida = { ...nov, financeiro: { ...nov.financeiro!, jaLiquidada: true, liquidadoLiquidoCentavos: 1 } }
  const r = ler(prepararRevisaoFuturasRecorrente({ ...input, persistidas: [input.persistidas[0], protegida], ausenciasConfirmadas: ['r10-serie-202612'] }, comando, ctx))
  expect(r.ocorrenciasAlteradas).toEqual([])
  expect(r.preservadas).toEqual([{ id: nov.id, motivo: 'historicoLiquidacao' }])
  expect(prepararRevisaoFuturasRecorrente({ ...input, persistidas: [input.persistidas[0], protegida] }, comando, ctx).ok).toBe(false)
})
it('substitui padrão no mesmo limite sem duplicar revisão e rejeita vigência passada/versão antiga', () => {
  const r = ler(prepararRevisaoFuturasRecorrente(entrada(), { ...comando, vigenciaMes: '2026-10' }, ctx))
  expect(r.revisoes).toHaveLength(2)
  expect(r.revisoes[0].id).toBe('serie-202610')
  for (const patch of [{ vigenciaMes: '2026-09' }, { expectedVersionSerie: 1 }, { alteracoes: { quantidadeParcelas: 10 } }]) expect(prepararRevisaoFuturasRecorrente(entrada(), { ...comando, ...patch }, ctx).ok).toBe(false)
})
