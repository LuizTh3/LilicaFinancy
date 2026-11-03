import { expect, it } from 'vitest'
import { prepararEdicaoParcelada, prepararCancelamentoParcelado, prepararSubstituicaoParcelada, prepararVinculoReceita } from './parceladosCorrections'
import { entradaParceladaTeste, serieParceladaTeste } from './parcelados.testSupport'
import { ler } from './testing.testSupport'

const meta = { uid: 'A', instante: 3000, operationKey: 'edit' }
function protegida() { const s = serieParceladaTeste(); return { ...s, version: 2, updatedAt: 2000, ultimoEventoId: 'pagarParcela__paid', parcelas: { ...s.parcelas, p06: { ...s.parcelas.p06, liquidadoLiquidoCentavos: 20000, jaLiquidada: true, ultimoEventoParcelaId: 'pagarParcela__paid' } } } }
it('edita esta e futuras nunca pagas por ordinal, sem compactar protegidas nem alterar competências', () => {
  const s = protegida(), copy = JSON.stringify(s)
  const p = ler(prepararEdicaoParcelada(s, { expectedVersion: 2, selecionada: 5, alcance: 'estaEFuturasNaoPagas', alteracoes: { valorCentavos: 25000, vencimento: '2026-10-30' } }, meta))
  expect(p.preservadas).toEqual([{ numero: 6, motivo: 'historicoLiquidacao' }])
  expect(p.depois.parcelas.p06).toEqual(s.parcelas.p06)
  expect(p.depois.parcelas.p07.vencimento).toBe('2026-12-30')
  expect(p.depois.parcelas.p07.competenciaPlanejamento).toBe('2026-12')
  expect(p.depois.parcelas.p10.valorCentavos).toBe(25000)
  expect(JSON.stringify(s)).toBe(copy)
})
it('edição isolada preserva futuras e no-op não incrementa versão nem cria evento', () => {
  const s = serieParceladaTeste()
  const p = ler(prepararEdicaoParcelada(s, { expectedVersion: 1, selecionada: 5, alcance: 'esta', alteracoes: { descricao: 'Nova descrição' } }, meta))
  expect(p.depois.parcelas.p06).toEqual(s.parcelas.p06)
  expect(p.depois.version).toBe(2)
  const noop = ler(prepararEdicaoParcelada(s, { expectedVersion: 1, selecionada: 5, alcance: 'esta', alteracoes: { descricao: s.parcelas.p05.descricao } }, meta))
  expect(noop.semAlteracao).toBe(true)
  expect(noop.depois).toEqual(s)
})
it('ordem conflitante com parcela protegida e seleção protegida isolada rejeitam tudo', () => {
  const s = protegida()
  expect(prepararEdicaoParcelada(s, { expectedVersion: 2, selecionada: 5, alcance: 'esta', alteracoes: { vencimento: '2026-12-31' } }, meta).ok).toBe(false)
  expect(prepararEdicaoParcelada(s, { expectedVersion: 2, selecionada: 6, alcance: 'esta', alteracoes: { valorCentavos: 1 } }, meta).ok).toBe(false)
  expect(prepararEdicaoParcelada(s, { expectedVersion: 1, selecionada: 5, alcance: 'esta', alteracoes: {} }, meta)).toMatchObject({ ok: false, erro: { codigo: 'conflitoVersao' } })
})
it('cancela com motivo e líquido zero, inclusive histórico revertido, sem apagar valores', () => {
  const s = protegida()
  expect(prepararCancelamentoParcelado(s, { expectedVersion: 2, numeros: [6], motivo: 'Renegociar' }, meta).ok).toBe(false)
  const revertida = { ...s, parcelas: { ...s.parcelas, p06: { ...s.parcelas.p06, liquidadoLiquidoCentavos: 0 } } }
  const p = ler(prepararCancelamentoParcelado(revertida, { expectedVersion: 2, numeros: [6], motivo: 'Renegociar' }, meta))
  expect(p.depois.parcelas.p06).toMatchObject({ estadoObrigacao: 'cancelada', valorCentavos: 20000, jaLiquidada: true })
  expect(prepararCancelamentoParcelado(s, { expectedVersion: 2, numeros: [5, 5], motivo: 'X' }, meta).ok).toBe(false)
})
it('substituição cria identidade nova, cancela alvos explicitamente e não transporta receita ou fatos', () => {
  const s = { ...serieParceladaTeste(), version: 2, updatedAt: 2000, ultimoEventoId: 'vincularReceita__link', receitaVinculadaId: 'income' }
  const p = ler(prepararSubstituicaoParcelada(s, { expectedVersion: 2, numeros: [5, 6, 7, 8, 9, 10], motivo: 'Acordo manual', novaSerieId: 'newserie', novaEntrada: entradaParceladaTeste }, meta))
  expect(p.antiga.receitaVinculadaId).toBe('income')
  expect(p.nova.substituiSerieId).toBe('serie')
  expect('receitaVinculadaId' in p.nova).toBe(false)
  expect(Object.values(p.nova.parcelas).every(row => !row.jaLiquidada && row.liquidadoLiquidoCentavos === 0)).toBe(true)
  expect(prepararSubstituicaoParcelada(s, { expectedVersion: 2, numeros: [5], motivo: 'X', novaSerieId: 'serie', novaEntrada: entradaParceladaTeste }, meta).ok).toBe(false)
})
it('vincula somente receita explícita própria e única, sem criar recebimento', () => {
  const s = serieParceladaTeste(), receita = { id: 'income', uid: 'A', natureza: 'receita' }
  const p = ler(prepararVinculoReceita(s, { expectedVersion: 1, receita, vinculoAusente: true }, meta))
  expect(p.serie.receitaVinculadaId).toBe('income')
  expect('fato' in p).toBe(false)
  expect(prepararVinculoReceita(p.serie, { expectedVersion: 2, receita: { ...receita, id: 'other' }, vinculoAusente: true }, meta).ok).toBe(false)
  expect(prepararVinculoReceita(s, { expectedVersion: 1, receita: { ...receita, uid: 'B' }, vinculoAusente: true }, meta).ok).toBe(false)
  expect(prepararVinculoReceita(s, { expectedVersion: 1, receita, vinculoAusente: false }, meta).ok).toBe(false)
})
