import { expect, it } from 'vitest'
import { prepararCadastroRecorrente, prepararGeracaoRecorrente } from './recorrencias'
import { ler } from './testing.testSupport'

const entrada = { natureza: 'despesaExterna', inicio: '2026-10-20', terminoOriginal: '2027-03-31', descricao: 'Energia', categoriaId: 'cat', valorCentavos: 15000, estimado: true, diaAncora: 31 }
const meta = { uid: 'A', serieId: 'energia' }
const cadastroRecorrenteTeste = () => ler(prepararCadastroRecorrente(entrada, meta))
const geracaoRecorrenteTeste = () => {
  const { serie, revisao } = cadastroRecorrenteTeste()
  return { contexto: { uid: 'A', inicioMes: '2026-10', fimMes: '2027-03', base: 'planejamento' as const, seriesCompletas: true, persistidasCompletas: true }, series: [serie], revisoes: [revisao], persistidas: [], ausenciasConfirmadas: ['202610', '202611', '202612', '202701', '202702', '202703'].map(m => `r10-energia-${m}`), destinosCartao: [] }
}
it('cadastra padrão mensal sem gerar parcelas, dinheiro ou ocorrências implicitamente', () => {
  const r = cadastroRecorrenteTeste()
  expect(r.serie).toMatchObject({ id: 'energia', version: 1, inicio: '2026-10-20' })
  expect(r.revisao).toMatchObject({ id: 'energia-202610', diaAncora: 31, estimado: true })
  expect(Object.keys(r).sort()).toEqual(['revisao', 'serie'])
  for (const patch of [{ quantidadeParcelas: 12 }, { cartaoId: 'card' }, { terminoOriginal: '2026-10-19' }, { diaAncora: 32 }, { valorCentavos: 0 }]) expect(prepararCadastroRecorrente({ ...entrada, ...patch }, meta).ok).toBe(false)
})
it('materializa seis identidades reconciliadas, mantém estimativa e não gera pagamentos', () => {
  const p = ler(prepararGeracaoRecorrente(geracaoRecorrenteTeste()))
  expect(p.novas).toHaveLength(6)
  expect(p.novas.map(o => o.financeiro && 'vencimento' in o.financeiro ? o.financeiro.vencimento : '')).toEqual(['2026-10-31', '2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28', '2027-03-31'])
  expect(p.novas.every(o => o.estado === 'persistida' && o.financeiro?.estimado && 'liquidadoLiquidoCentavos' in o.financeiro && o.financeiro.liquidadoLiquidoCentavos === 0)).toBe(true)
  expect(p.series[0].version).toBe(2)
  const replay = ler(prepararGeracaoRecorrente({ ...geracaoRecorrenteTeste(), series: p.series, persistidas: p.novas, ausenciasConfirmadas: [] }))
  expect(replay.novas).toEqual([])
  expect(replay.series[0].version).toBe(2)
})
it('nega geração parcial e duplicidade de série em entrada de materialização', () => {
  expect(prepararGeracaoRecorrente({ ...geracaoRecorrenteTeste(), ausenciasConfirmadas: [] }).ok).toBe(false)
  expect(prepararGeracaoRecorrente({ ...geracaoRecorrenteTeste(), contexto: { ...geracaoRecorrenteTeste().contexto, seriesCompletas: false } }).ok).toBe(false)
  expect(prepararGeracaoRecorrente({ ...geracaoRecorrenteTeste(), series: [cadastroRecorrenteTeste().serie, cadastroRecorrenteTeste().serie] }).ok).toBe(false)
})
it('intervalo válido sem dia elegível não cria obrigação fictícia', () => {
  const c = ler(prepararCadastroRecorrente({ ...entrada, inicio: '2026-10-20', terminoOriginal: '2026-10-25' }, meta))
  const r = ler(prepararGeracaoRecorrente({ ...geracaoRecorrenteTeste(), contexto: { ...geracaoRecorrenteTeste().contexto, fimMes: '2026-10' }, series: [c.serie], revisoes: [c.revisao], ausenciasConfirmadas: [] }))
  expect(r.novas).toEqual([])
})
it('dia31 ajusta fevereiro em1900 e2000 sem perder identidade mensal', () => {
  for (const [ano, esperado] of [['1900', '1900-02-28'], ['2000', '2000-02-29']]) {
    const c = ler(prepararCadastroRecorrente({ ...entrada, inicio: `${ano}-02-01`, terminoOriginal: `${ano}-03-01` }, meta))
    const r = ler(prepararGeracaoRecorrente({ ...geracaoRecorrenteTeste(), contexto: { ...geracaoRecorrenteTeste().contexto, inicioMes: `${ano}-02`, fimMes: `${ano}-02` }, series: [c.serie], revisoes: [c.revisao], ausenciasConfirmadas: [`r10-energia-${ano}02`] }))
    expect(r.novas[0].id).toBe(`r10-energia-${ano}02`)
    expect(r.novas[0].financeiro && 'vencimento' in r.novas[0].financeiro ? r.novas[0].financeiro.vencimento : undefined).toBe(esperado)
  }
})
