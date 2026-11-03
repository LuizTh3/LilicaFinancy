import { expect, it } from 'vitest'
import { projetarRecorrencias, indiceVirtualRecorrente } from './recorrenciasProjection'
import { identidadeOcorrenciaRecorrente } from './recorrenciasValidation'
import { calendarioBaseFatura } from './invoiceCalendar'
import { ler } from './testing.testSupport'
import type { LinhaProjecaoRecorrente, OcorrenciaRecorrente } from './contracts/recorrencias'
function persistir(linha: LinhaProjecaoRecorrente): OcorrenciaRecorrente { const { fonte: _, ...o } = linha; return { ...o, estado: o.estado === 'virtual' ? 'persistida' : o.estado } }

const serie = { id: 'energia', uid: 'A', version: 1, natureza: 'despesaExterna', inicio: '2026-10-20', terminoOriginal: '2027-03-31', estado: 'ativa' }
const revisao = { id: 'energia-202610', uid: 'A', serieId: 'energia', version: 1, inicioMes: '2026-10', descricao: 'Energia', categoriaId: 'cat', valorCentavos: 15000, estimado: true, diaAncora: 31 }
const ctx = { uid: 'A', inicioMes: '2026-10', fimMes: '2027-03', base: 'planejamento', seriesCompletas: true, persistidasCompletas: true }
const meses = ['2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03']
const ausencias = meses.map(m => ler(identidadeOcorrenciaRecorrente('energia', m)))
const entrada = () => ({ contexto: ctx, series: [serie], revisoes: [revisao], persistidas: [], ausenciasConfirmadas: ausencias, destinosCartao: [] })
it('projeta seis datas inclusivas com a regra compartilhada e identidades estáveis', () => {
  const p = ler(projetarRecorrencias(entrada()))
  expect(p.completo).toBe(true)
  expect(p.linhas.map(o => o.financeiro && 'vencimento' in o.financeiro ? o.financeiro.vencimento : '')).toEqual(['2026-10-31', '2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28', '2027-03-31'])
  expect(p.linhas.every(o => o.fonte === 'virtual' && o.financeiro?.estimado)).toBe(true)
  expect(p.linhas[1].id).toBe('r10-energia-202611')
})
it('persistida confirmada vence virtual, sem confundir confirmação com materialização', () => {
  const p = ler(projetarRecorrencias(entrada())), novembro = p.linhas[1]
  const persistida = { ...novembro, version: 2, fonte: undefined, estado: 'persistida', excecaoIndividual: true, financeiro: { ...novembro.financeiro!, valorCentavos: 17342, estimado: false } }
  const { fonte: _, ...o } = persistida
  const out = ler(projetarRecorrencias({ ...entrada(), series: [{ ...serie, version: 2 }], persistidas: [o], ausenciasConfirmadas: ausencias.filter(id => id !== o.id) }))
  expect(out.linhas.filter(l => l.id === o.id)).toHaveLength(1)
  expect(out.linhas.find(l => l.id === o.id)).toMatchObject({ fonte: 'persistida', financeiro: { valorCentavos: 17342, estimado: false } })
})
it('tombstone pulada impede recriação e cancelada conserva o financeiro', () => {
  const inicial = ler(projetarRecorrencias(entrada())).linhas[1], { fonte: _, financeiro: __, ...base } = inicial
  const pulada = { ...base, estado: 'pulada', excecaoIndividual: true, motivoSupressao: 'Mês pulado' }
  const out = ler(projetarRecorrencias({ ...entrada(), persistidas: [pulada], ausenciasConfirmadas: ausencias.filter(id => id !== base.id) }))
  expect(out.linhas.find(l => l.id === base.id)).toMatchObject({ fonte: 'persistida', estado: 'pulada' })
  expect(out.linhas.find(l => l.id === base.id)?.financeiro).toBeUndefined()
  const { fonte: ___, ...o } = inicial
  const cancelada = { ...o, estado: 'cancelada', excecaoIndividual: true, motivoSupressao: 'Cancelada' }
  expect(ler(projetarRecorrencias({ ...entrada(), persistidas: [cancelada], ausenciasConfirmadas: ausencias.filter(id => id !== o.id) })).linhas.find(l => l.id === o.id)).toMatchObject({ estado: 'cancelada', financeiro: { valorCentavos: 15000 } })
})
it('encerrar impede virtuais posteriores sem apagar compromisso persistido', () => {
  const persistida = persistir(ler(projetarRecorrencias(entrada())).linhas[4])
  const out = ler(projetarRecorrencias({ ...entrada(), series: [{ ...serie, estado: 'encerrada', encerradaDesdeMes: '2027-01' }], persistidas: [persistida], ausenciasConfirmadas: ausencias.filter(id => id !== persistida.id) }))
  expect(out.linhas.map(l => l.mesReferencia)).toEqual(['2026-10', '2026-11', '2026-12', '2027-02'])
})
it('aplica vigência de revisões sem reescrever passado e detecta sobreposição', () => {
  const revisoes = [{ ...revisao, fimExclusivo: '2027-01' }, { ...revisao, id: 'energia-202701', inicioMes: '2027-01', valorCentavos: 20000 }]
  expect(ler(projetarRecorrencias({ ...entrada(), revisoes })).linhas.map(l => l.financeiro?.valorCentavos)).toEqual([15000, 15000, 15000, 20000, 20000, 20000])
  expect(projetarRecorrencias({ ...entrada(), revisoes: [revisao, revisoes[1]] }).ok).toBe(false)
})
it('não emite virtual antes de reconciliar slot/revisão e preserva parcialidade', () => {
  const semSlot = ler(projetarRecorrencias({ ...entrada(), ausenciasConfirmadas: [] }))
  expect(semSlot.linhas).toEqual([])
  expect(semSlot.completo).toBe(false)
  expect(semSlot.pendencias.some(p => p.motivo === 'slotNaoReconciliado')).toBe(true)
  expect(ler(projetarRecorrencias({ ...entrada(), revisoes: [] })).completo).toBe(false)
  expect(ler(projetarRecorrencias({ ...entrada(), contexto: { ...ctx, seriesCompletas: false } })).completo).toBe(false)
})
it('preserva exceção de competência cuja identidade está fora da janela', () => {
  const o = persistir(ler(projetarRecorrencias(entrada())).linhas[1])
  const modificado = { ...o, excecaoIndividual: true, financeiro: { ...o.financeiro!, competenciaPlanejamento: '2027-03' } }
  const out = ler(projetarRecorrencias({ ...entrada(), contexto: { ...ctx, inicioMes: '2027-03', fimMes: '2027-03' }, persistidas: [modificado], ausenciasConfirmadas: [ausencias[5]] }))
  expect(out.linhas.map(l => l.mesReferencia)).toEqual(['2026-11', '2027-03'])
})
it('assinatura precisa destino resolvido e produz um item mensal sem parcelas infinitas', () => {
  const s = { ...serie, natureza: 'assinaturaCartao' }, r = { ...revisao, diaAncora: 1, cartaoId: 'card' }
  const base = { ...entrada(), contexto: { ...ctx, inicioMes: '2026-11', fimMes: '2026-11', intervaloCobranca: { inicio: '2026-10-10', fimExclusivo: '2026-11-10' } }, series: [s], revisoes: [r], ausenciasConfirmadas: [ausencias[1]] }
  expect(ler(projetarRecorrencias(base)).completo).toBe(false)
  const destino = { uid: 'A', serieId: 'energia', mesReferencia: '2026-11', cartaoId: 'card', calendario: ler(calendarioBaseFatura('2026-11', 10, 17)), escolha: 'sugerida' }
  const out = ler(projetarRecorrencias({ ...base, destinosCartao: [destino] }))
  expect(out.completo).toBe(true)
  expect(out.linhas).toHaveLength(1)
  expect(out.linhas[0].financeiro).toMatchObject({ faturaId: 'card__2026-11', dataCompra: '2026-11-01' })
  expect('quantidadeParcelas' in out.linhas[0]).toBe(false)
})
it('planejamento de assinatura usa o ciclo da fatura, incluindo cobrança do mês anterior', () => {
  const s = { ...serie, natureza: 'assinaturaCartao' }, r = { ...revisao, cartaoId: 'card' }
  const destino = { uid: 'A', serieId: 'energia', mesReferencia: '2026-10', cartaoId: 'card', calendario: ler(calendarioBaseFatura('2026-11', 10, 17)), escolha: 'sugerida' }
  const base = { ...entrada(), contexto: { ...ctx, inicioMes: '2026-11', fimMes: '2026-11', intervaloCobranca: { inicio: '2026-10-10', fimExclusivo: '2026-11-10' } }, series: [s], revisoes: [r], ausenciasConfirmadas: [ausencias[0]], destinosCartao: [destino] }
  const p = ler(projetarRecorrencias(base))
  expect(p.completo).toBe(true)
  expect(p.linhas.map(l => l.mesReferencia)).toEqual(['2026-10'])
  const { intervaloCobranca: _, ...semCiclo } = base.contexto
  expect(ler(projetarRecorrencias({ ...base, contexto: semCiclo })).completo).toBe(false)
})
it('nega UID alheio, janela13, identidade falsa e ausência que contradiz persistida', () => {
  expect(projetarRecorrencias({ ...entrada(), series: [{ ...serie, uid: 'B' }] }).ok).toBe(false)
  expect(projetarRecorrencias({ ...entrada(), contexto: { ...ctx, fimMes: '2027-10' } }).ok).toBe(false)
  const o = persistir(ler(projetarRecorrencias(entrada())).linhas[0])
  expect(projetarRecorrencias({ ...entrada(), persistidas: [o] }).ok).toBe(false)
  expect(projetarRecorrencias({ ...entrada(), persistidas: [{ ...o, id: 'bad' }], ausenciasConfirmadas: [] }).ok).toBe(false)
})
it('deriva intervalo de descoberta virtual, inclusive encerramento no limite inferior', () => {
  expect(ler(indiceVirtualRecorrente({ ...serie, estado: 'encerrada', encerradaDesdeMes: '2027-01' }))).toEqual({ versaoIndiceVirtual: 1, inicioVirtual: '2026-10-20', fimVirtualInclusivo: '2026-12-31', virtualElegivel: true })
  expect(ler(indiceVirtualRecorrente({ ...serie, inicio: '1900-01-01', terminoOriginal: undefined, estado: 'encerrada', encerradaDesdeMes: '1900-01' }))).toMatchObject({ fimVirtualInclusivo: '1900-01-01', virtualElegivel: false })
})
