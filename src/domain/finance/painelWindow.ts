import { avancarCompetencia } from './calendar'
import { contribuicaoPainelValida, fontesNecessariasPainel, normalizarConsultaPainel, validarSnapshotPainel } from './contracts/painel'
import type { ConsultaPainel, SnapshotPainel, ContribuicaoPainel, CoberturaPainel, JanelaPainel, ResumoMensalPainel } from './contracts/painel'
import { falha, registro, sucesso } from './errors'
import type { Resultado } from './errors'
import { consolidarPlanejamento } from './painel'
import { consolidarMovimentosPainel } from './painelBases'

/** Pure window composition; all input comes from the same externally reconciled snapshot. */
export function consolidarJanelaPainel(input: ConsultaPainel, snapshot: SnapshotPainel, dados: readonly ContribuicaoPainel[], cobertura: readonly CoberturaPainel[], ctx: { uid: string; generation: number; agora: number }): Resultado<JanelaPainel> {
  const query = normalizarConsultaPainel(input), instante = validarSnapshotPainel(snapshot, ctx)
  if (!query.ok) return query
  if (!instante.ok) return instante
  const q = query.valor
  const invalid = () => falha('integridadeIndeterminada', 'A janela contém contribuições ou cobertura incompatíveis.', { recuperacao: 'reler' })
  if (!Array.isArray(dados) || !Array.isArray(cobertura)) return invalid()
  const unicas = new Map<string, ContribuicaoPainel>()
  for (const row of dados) {
    if (!contribuicaoPainelValida(row, q)) return invalid()
    const anterior = unicas.get(row.chave)
    if (anterior && JSON.stringify(anterior) !== JSON.stringify(row)) return invalid()
    unicas.set(row.chave, row)
  }
  if (cobertura.some(c => !registro(c) || typeof c.competencia !== 'string' || c.competencia < q.inicio || c.competencia > q.fim || !fontesNecessariasPainel(q.base).some(f => f === c.fonte))) return invalid()
  const meses: ResumoMensalPainel[] = []
  for (let i = 0; i < (q.modo === 'mensal' ? 1 : 12); i++) {
    const mes = avancarCompetencia(q.inicio, i)
    if (!mes.ok) return mes
    const consolidar = q.base === 'planejamento' ? consolidarPlanejamento : consolidarMovimentosPainel
    const mensal = consolidar({ ...q, inicio: mes.valor, fim: mes.valor, modo: 'mensal' }, instante.valor, [...unicas.values()].filter(c => c.competencia === mes.valor), cobertura.filter(c => c.competencia === mes.valor), ctx)
    if (!mensal.ok) return mensal
    meses.push(mensal.valor)
  }
  return sucesso(Object.freeze({ consulta: q, snapshot: instante.valor, meses: Object.freeze(meses), cobertura: Object.freeze(cobertura.map(c => Object.freeze({ ...c }))), completo: meses.every(m => Object.entries(m.indicadores).every(([nome, i]) => nome === 'saldoBancario' || i.estado === 'completo')) }))
}
export function consolidarJanelaPlanejamento(input: ConsultaPainel, snapshot: SnapshotPainel, dados: readonly ContribuicaoPainel[], cobertura: readonly CoberturaPainel[], ctx: { uid: string; generation: number; agora: number }): Resultado<JanelaPainel> {
  return input.base === 'planejamento' ? consolidarJanelaPainel(input, snapshot, dados, cobertura, ctx) : falha('valorInvalido', 'Esta janela aceita somente a base de planejamento.')
}
