import { contribuicaoPainelValida, fontesNecessariasPainel, normalizarConsultaPainel, validarSnapshotPainel } from './contracts/painel'
import type { ContribuicaoPainel, ConsultaPainel, CoberturaPainel, FontePainel, IndicadorPainel, ResumoMensalPainel, SnapshotPainel } from './contracts/painel'
import { falha, registro, sucesso } from './errors'
import type { Resultado } from './errors'
import { centavos, diferencaMonetaria, somarCentavos } from './money'

const indicators = ['receitasPrevistas', 'recebidoDasReceitas', 'aReceber', 'compromissos', 'liquidadoDosCompromissos', 'pendente', 'resultadoPrevisto'] as const
export function consolidarPlanejamento(input: ConsultaPainel, snapshot: SnapshotPainel, dados: readonly ContribuicaoPainel[], cobertura: readonly CoberturaPainel[], ctx: { uid: string; generation: number; agora: number }): Resultado<ResumoMensalPainel> {
 const query = normalizarConsultaPainel(input), t = validarSnapshotPainel(snapshot, ctx)
 if (!query.ok) return query
 if (!t.ok) return t
 const q = query.valor
 if (q.base !== 'planejamento' || q.inicio !== q.fim) return falha('limiteOperacional', 'Este consolidador aceita somente planejamento de um mês.')
 const invalid = () => falha('integridadeIndeterminada', 'As contribuições do período não estão reconciliadas.')
 if (!Array.isArray(dados) || !Array.isArray(cobertura)) return invalid()
 const unique = new Map<string, ContribuicaoPainel>()
 for (const row of dados) {
  if (!contribuicaoPainelValida(row, q)) return invalid()
  const old = unique.get(row.chave)
  if (old && JSON.stringify(old) !== JSON.stringify(row)) return invalid()
  unique.set(row.chave, row)
 }
 for (const c of cobertura) if (!registro(c) || !fontesNecessariasPainel(q.base).some(f => f === c.fonte) || c.competencia !== q.inicio || typeof c.fase !== 'string' || !['naoIniciada', 'emAndamento', 'completa', 'indisponivel', 'erro'].includes(String(c.estado))) return invalid()
 if (Object.keys(q.filtros).length) return sucesso({ competencia: q.inicio, base: q.base, indicadores: Object.fromEntries(indicators.map(key => [key, { estado: 'indisponivel', motivo: 'filtroIncompativel' } as IndicadorPainel])) })
 const incomes: ContribuicaoPainel[] = [], commitments: ContribuicaoPainel[] = []
 for (const row of unique.values()) {
  if (!['externo', 'fatura', 'parcelaExterna', 'ocorrenciaExterna'].includes(row.autoridade)) continue // Children/origins explain the total; they are not another obligation.
  if (!centavos(row.liquidadoCentavos).ok || row.estadoObrigacao === undefined || row.fonte === 'virtual' && row.liquidadoCentavos !== 0 || row.estadoObrigacao === 'cancelada' && row.liquidadoCentavos !== 0) return invalid()
  if (row.estadoObrigacao === 'cancelada') continue
  if (row.natureza === 'entrada') { if (!['externo', 'ocorrenciaExterna'].includes(row.autoridade)) return invalid(); incomes.push(row) } else commitments.push(row)
 }
 const values = {
  receitasPrevistas: somarCentavos(incomes.map(r => r.valorCentavos)), recebidoDasReceitas: somarCentavos(incomes.map(r => r.liquidadoCentavos)), aReceber: somarCentavos(incomes.map(r => r.valorCentavos - r.liquidadoCentavos!)),
  compromissos: somarCentavos(commitments.map(r => r.valorCentavos)), liquidadoDosCompromissos: somarCentavos(commitments.map(r => r.liquidadoCentavos)), pendente: somarCentavos(commitments.map(r => r.valorCentavos - r.liquidadoCentavos!)),
 }
 for (const r of Object.values(values)) if (!r.ok) return r
 const complete = (required: readonly FontePainel[]) => required.every(f => { const rows = cobertura.filter(c => c.fonte === f); return rows.length > 0 && rows.every(c => c.estado === 'completa') })
 const incomeComplete = complete(['externos', 'recorrencias']), expenseComplete = complete(fontesNecessariasPainel(q.base))
 const result: Record<string, IndicadorPainel> = {}
 for (const key of Object.keys(values) as (keyof typeof values)[]) {
  const amount = values[key]; if (!amount.ok) return amount
  const receita = ['receitasPrevistas', 'recebidoDasReceitas', 'aReceber'].includes(key), rows = receita ? incomes : commitments
  const estimated = somarCentavos(rows.filter(r => r.estimado).map(r => key === 'recebidoDasReceitas' || key === 'liquidadoDosCompromissos' ? r.liquidadoCentavos! : key === 'aReceber' || key === 'pendente' ? r.valorCentavos - r.liquidadoCentavos! : r.valorCentavos))
  if (!estimated.ok) return estimated
  result[key] = (receita ? incomeComplete : expenseComplete) ? { estado: 'completo', valorCentavos: amount.valor, estimadoCentavos: estimated.valor, contribuicoes: rows.map(r => r.chave), readTime: t.valor.readTime } : { estado: 'parcial', subtotalCentavos: amount.valor, motivos: ['paginasIncompletas'], readTime: t.valor.readTime }
 }
 const income = values.receitasPrevistas, expense = values.compromissos
 if (!income.ok) return income
 if (!expense.ok) return expense
 const difference = diferencaMonetaria(income.valor, expense.valor), estimatedResult = somarCentavos([...incomes, ...commitments].filter(r => r.estimado).map(r => r.valorCentavos))
 if (!difference.ok) return difference
 if (!estimatedResult.ok) return estimatedResult
 result.resultadoPrevisto = incomeComplete && expenseComplete ? { estado: 'completo', resultado: difference.valor, estimadoCentavos: estimatedResult.valor, contribuicoes: [...incomes, ...commitments].map(r => r.chave), readTime: t.valor.readTime } : { estado: 'indisponivel', motivo: 'paginasIncompletas' }
 return sucesso({ competencia: q.inicio, base: q.base, indicadores: Object.freeze(result) })
}
