import { expect, it } from 'vitest'
import { prepararConfirmacaoValorRecorrente, prepararEncerramentoRecorrente, prepararSupressaoRecorrente } from './recorrenciasLifecycle'
import { prepararCadastroRecorrente, prepararGeracaoRecorrente } from './recorrencias'
import { projetarRecorrencias } from './recorrenciasProjection'
import { ler } from './testing.testSupport'

const cadastro = () => ler(prepararCadastroRecorrente({ natureza: 'despesaExterna', inicio: '2026-10-01', diaAncora: 31, descricao: 'Energia', categoriaId: 'cat', valorCentavos: 15000, estimado: true }, { uid: 'A', serieId: 'energy' }))
const entrada = () => { const c = cadastro(); return { contexto: { uid: 'A', inicioMes: '2026-10', fimMes: '2026-11', base: 'planejamento' as const, seriesCompletas: true, persistidasCompletas: true }, series: [c.serie], revisoes: [c.revisao], persistidas: [], ausenciasConfirmadas: ['r10-energy-202610', 'r10-energy-202611'], destinosCartao: [] } }
const ctx = { uid: 'A', hoje: '2026-10-21' }
it('pulo virtual vira tombstone sem financeiro e impede geração posterior', () => {
  const virtual = ler(projetarRecorrencias(entrada())).linhas[0]
  const r = ler(prepararSupressaoRecorrente(cadastro().serie, virtual, { tipo: 'pular', expectedVersionSerie: 1, expectedVersionOcorrencia: 0, motivo: 'Não haverá cobrança' }, ctx))
  expect(r.ocorrencia).toMatchObject({ estado: 'pulada', excecaoIndividual: true })
  expect(r.ocorrencia.financeiro).toBeUndefined()
  const gerada = ler(prepararGeracaoRecorrente({ ...entrada(), series: [r.serie], persistidas: [r.ocorrencia], ausenciasConfirmadas: ['r10-energy-202611'] }))
  expect(gerada.novas.map(o => o.mesReferencia)).toEqual(['2026-11'])
})
it('cancelamento preserva original e recusa qualquer histórico de liquidação', () => {
  const g = ler(prepararGeracaoRecorrente(entrada())), o = g.novas[0]
  const cmd = { tipo: 'cancelar', expectedVersionSerie: 2, expectedVersionOcorrencia: 1, motivo: 'Obrigação cancelada' }
  const r = ler(prepararSupressaoRecorrente(g.series[0], o, cmd, ctx))
  expect(r.ocorrencia).toMatchObject({ estado: 'cancelada', financeiro: { valorCentavos: 15000 } })
  expect(prepararSupressaoRecorrente(g.series[0], { ...o, financeiro: { ...o.financeiro!, jaLiquidada: true } }, cmd, ctx).ok).toBe(false)
  expect(prepararSupressaoRecorrente(r.serie, r.ocorrencia, { ...cmd, expectedVersionSerie: 3, expectedVersionOcorrencia: 2 }, ctx).ok).toBe(false)
})
it('confirmar estimativa virtual materializa valor definitivo sem liquidação', () => {
  const virtual = ler(projetarRecorrencias(entrada())).linhas[0]
  const r = ler(prepararConfirmacaoValorRecorrente(cadastro().serie, virtual, { expectedVersionSerie: 1, expectedVersionOcorrencia: 0, valorCentavos: 17342 }, ctx))
  expect(r.ocorrencia).toMatchObject({ estado: 'persistida', excecaoIndividual: true, financeiro: { estimado: false, valorCentavos: 17342, liquidadoLiquidoCentavos: 0, jaLiquidada: false } })
  expect(r.serie.version).toBe(2)
  expect(prepararConfirmacaoValorRecorrente(r.serie, r.ocorrencia, { expectedVersionSerie: 2, expectedVersionOcorrencia: 1, valorCentavos: 17342 }, ctx).ok).toBe(false)
})
it('encerramento exclui novos meses sem cancelar confirmadas posteriores e rejeita corte passado', () => {
  const g = ler(prepararGeracaoRecorrente(entrada()))
  const r = ler(prepararEncerramentoRecorrente(g.series[0], g.novas, { expectedVersionSerie: 2, primeiroMesExcluido: '2026-11', motivo: 'Fim do contrato' }, ctx))
  expect(r.serie).toMatchObject({ estado: 'encerrada', encerradaDesdeMes: '2026-11', version: 3 })
  expect(r.confirmadasPreservadas.map(o => o.mesReferencia)).toEqual(['2026-11'])
  expect(g.novas[1].estado).toBe('persistida')
  expect(prepararEncerramentoRecorrente(g.series[0], [], { expectedVersionSerie: 2, primeiroMesExcluido: '2026-09', motivo: 'Retroativo' }, ctx).ok).toBe(false)
  const virtual = ler(projetarRecorrencias(entrada())).linhas[1]
  expect(prepararConfirmacaoValorRecorrente(r.serie, virtual, { expectedVersionSerie: 3, expectedVersionOcorrencia: 0, valorCentavos: 17342 }, ctx).ok).toBe(false)
  expect(prepararConfirmacaoValorRecorrente(r.serie, g.novas[1], { expectedVersionSerie: 3, expectedVersionOcorrencia: 1, valorCentavos: 17342 }, ctx).ok).toBe(true)
})
