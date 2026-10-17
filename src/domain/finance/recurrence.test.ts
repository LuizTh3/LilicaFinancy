import { expect, it } from 'vitest'
import { confirmarValorOcorrencia, projetarOcorrencias } from './recurrence'
import { snapshot } from './fixtures.testSupport'
import { congelar, ler } from './testing.testSupport'

const molde = { id: 'energia', uid: 'A', schemaVersion: 1, version: 2, tipo: 'obrigacaoExterna', descricao: 'Energia', categoriaId: 'cat', valorCentavos: 15000, estimado: true, inicio: '2026-10-20', fim: '2027-03-31', diaAncora: 31, frequencia: 'mensal', estado: 'ativa' } as const
it('projeta somente calendário inclusivo com âncora, sem gravação automática', () => {
  const result = ler(projetarOcorrencias(congelar(molde), ['2026-10', '2026-11', '2027-02', '2027-04'], []))
  expect(result.map(o => o.tipo === 'obrigacaoExterna' ? o.vencimento : o.dataPrevista)).toEqual(['2026-10-31', '2026-11-30', '2027-02-28'])
  expect(result.every(o => o.estimado && !o.materializada && o.version === 1)).toBe(true)
  expect(ler(projetarOcorrencias({ ...molde, diaAncora: 5 }, ['2026-10'], []))).toEqual([])
  expect(projetarOcorrencias({ ...molde, fim: '2026-10-01' }, ['2026-11'], []).ok).toBe(false)
  expect(projetarOcorrencias({ ...molde, estado: 'encerrada', fim: undefined }, ['2026-11'], []).ok).toBe(false)
  expect(projetarOcorrencias({ ...molde, estado: ['ativa'] }, ['2026-11'], []).ok).toBe(false)
})
it('ocorrência existente, inclusive cancelada e movida no planejamento, vence a virtual', () => {
  const [preview] = ler(projetarOcorrencias(molde, ['2026-11'], []))
  const existing = { ...preview, materializada: true, estimado: false, valorCentavos: 16327, competenciaPlanejamento: '2026-10', estadoObrigacao: 'cancelada' as const }
  const result = ler(projetarOcorrencias({ ...molde, valorCentavos: 20000 }, ['2026-11'], [existing]))
  expect(result).toEqual([existing])
  expect(result[0].competenciaOcorrencia).toBe('2026-11')
})
it('confirma novembro mantendo molde, dezembro, identidade, datas e caixa', () => {
  const [nov, dec] = ler(projetarOcorrencias(molde, ['2026-11', '2026-12'], []))
  const occurrence = congelar({ ...nov, materializada: true })
  const target = snapshot({ alvo: { tipo: 'obrigacaoExternaAvulsa', id: nov.id }, origemId: nov.id, version: 1, revisao: { antes: 1, depois: 1 }, valorOriginalCentavos: 15000, estimado: true, vencimento: '2026-11-30', dataConsumo: '2026-11-30' })
  const result = ler(confirmarValorOcorrencia({ ocorrencia: occurrence, snapshot: target }, 16327, 1))
  expect(result.ocorrencia).toMatchObject({ id: nov.id, valorCentavos: 16327, estimado: false, version: 2, competenciaOcorrencia: '2026-11', competenciaPlanejamento: '2026-11' })
  expect(dec).toMatchObject({ estimado: true, valorCentavos: 15000 })
  expect(molde).toMatchObject({ estimado: true, valorCentavos: 15000 })
  expect(result.snapshot?.fatos).toEqual([])
  expect(confirmarValorOcorrencia({ ocorrencia: occurrence, snapshot: target }, 16327, 9).ok).toBe(false)
  expect(confirmarValorOcorrencia({ ocorrencia: occurrence }, 16327, 1).ok).toBe(false)
  expect(ler(confirmarValorOcorrencia({ ocorrencia: nov }, 16327, 1)).ocorrencia.version).toBe(1)
})
it('preserva valores definitivos de receita e bloqueia mutação de valor já liquidado', () => {
  const [preview] = ler(projetarOcorrencias({ ...molde, tipo: 'receita', estimado: false }, ['2026-11'], []))
  expect(preview).toMatchObject({ tipo: 'receita', estimado: false })
  const current = { ...preview, materializada: true }
  const target = snapshot({ alvo: { tipo: 'receita', id: current.id }, origemId: current.id, version: 1, revisao: { antes: 1, depois: 1 }, valorOriginalCentavos: 15000, vencimento: '2026-11-30', estimado: false, fatos: [{ id: 'r1', uid: 'A', schemaVersion: 1, version: 1, tipo: 'recebimento', alvo: { tipo: 'receita', id: current.id }, valorCentavos: 100, dataEfetiva: '2026-11-30', contaId: 'conta', operacaoId: 'op' }] })
  expect(confirmarValorOcorrencia({ ocorrencia: current, snapshot: target }, 16000, 1).ok).toBe(false)
})
