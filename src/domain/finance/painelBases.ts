import { contribuicaoPainelValida, fontesNecessariasPainel, normalizarConsultaPainel, validarSnapshotPainel } from './contracts/painel'
import type { ContribuicaoPainel, ConsultaPainel, CoberturaPainel, IndicadorPainel, ResumoMensalPainel, SnapshotPainel } from './contracts/painel'
import { camposPermitidos, falha, registro, sucesso } from './errors'
import type { Resultado } from './errors'
import { diferencaMonetaria, somarCentavos } from './money'

/** Cash facts and expense-origin effects are independently mapped before consolidation. */
export function consolidarMovimentosPainel(input: ConsultaPainel, snapshot: SnapshotPainel, dados: readonly ContribuicaoPainel[], cobertura: readonly CoberturaPainel[], ctx: { uid: string; generation: number; agora: number }): Resultado<ResumoMensalPainel> {
  const consulta = normalizarConsultaPainel(input), t = validarSnapshotPainel(snapshot, ctx)
  if (!consulta.ok) return consulta
  if (!t.ok) return t
  const q = consulta.valor
  if (q.base === 'planejamento' || q.modo !== 'mensal') return falha('valorInvalido', 'Selecione caixa ou consumo de um mês.')
  const erro = () => falha('integridadeIndeterminada', 'Movimentos, datas e cobertura não estão reconciliados.')
  if (!Array.isArray(dados) || !Array.isArray(cobertura)) return erro()
  const unicas = new Map<string, ContribuicaoPainel>()
  for (const row of dados) {
    if (!contribuicaoPainelValida(row, q)) return erro()
    const anterior = unicas.get(row.chave)
    if (anterior && JSON.stringify(anterior) !== JSON.stringify(row)) return erro()
    unicas.set(row.chave, row)
  }
  const fontes = fontesNecessariasPainel(q.base)
  for (const c of cobertura) if (!registro(c) || !camposPermitidos(c, ['fonte', 'fase', 'competencia', 'estado']) || !fontes.some(f => f === c.fonte) || c.competencia !== q.inicio || typeof c.fase !== 'string' || typeof c.estado !== 'string' || !['naoIniciada', 'emAndamento', 'completa', 'indisponivel', 'erro'].includes(c.estado)) return erro()
  const nomes = q.base === 'caixa' ? ['entradasCaixa', 'saidasCaixa', 'variacaoCaixa'] : ['despesasConsumo', 'reducoesConsumo', 'consumoLiquido']
  const resultado: Record<string, IndicadorPainel> = {}
  if (Object.keys(q.filtros).length) return sucesso({ competencia: q.inicio, base: q.base, indicadores: Object.fromEntries(nomes.map(n => [n, { estado: 'indisponivel', motivo: 'filtroIncompativel' } as IndicadorPainel])) })
  const entradas: ContribuicaoPainel[] = [], saidas: ContribuicaoPainel[] = []
  for (const row of unicas.values()) {
    if (row.autoridade === 'transferencia') continue
    if (q.base === 'caixa' ? row.autoridade !== 'fato' : !['compra', 'externo', 'efeito008', 'ocorrenciaExterna', 'assinatura'].includes(row.autoridade)) continue
    if (row.dataFinanceira.slice(0, 7) !== row.competencia) return erro()
    if (q.base === 'caixa' && (row.fonte !== 'persistida' || row.estimado || row.liquidadoCentavos !== undefined || row.estadoObrigacao !== undefined)) return erro()
    if (q.base === 'consumo' && row.natureza === 'entrada' && row.autoridade !== 'efeito008') return erro()
    if (row.estadoObrigacao === 'cancelada') continue
    if (row.natureza === 'entrada') entradas.push(row)
    else saidas.push(row)
  }
  const inSum = somarCentavos(entradas.map(r => r.valorCentavos)), outSum = somarCentavos(saidas.map(r => r.valorCentavos))
  if (!inSum.ok) return inSum
  if (!outSum.ok) return outSum
  const completo = fontes.every(fonte => { const estados = cobertura.filter(c => c.fonte === fonte); return estados.length > 0 && estados.every(c => c.estado === 'completa') })
  const pares = q.base === 'caixa' ? [[nomes[0], entradas, inSum.valor], [nomes[1], saidas, outSum.valor]] as const : [[nomes[0], saidas, outSum.valor], [nomes[1], entradas, inSum.valor]] as const
  for (const [nome, rows, valor] of pares) {
    const estimado = somarCentavos(rows.filter(r => r.estimado).map(r => r.valorCentavos))
    if (!estimado.ok) return estimado
    resultado[nome] = completo ? { estado: 'completo', valorCentavos: valor, estimadoCentavos: estimado.valor, contribuicoes: rows.map(r => r.chave), readTime: t.valor.readTime } : { estado: 'parcial', subtotalCentavos: valor, motivos: ['paginasIncompletas'], readTime: t.valor.readTime }
  }
  const saldo = q.base === 'caixa' ? diferencaMonetaria(inSum.valor, outSum.valor) : diferencaMonetaria(outSum.valor, inSum.valor)
  if (!saldo.ok) return saldo
  const estimado = somarCentavos([...entradas, ...saidas].filter(r => r.estimado).map(r => r.valorCentavos))
  if (!estimado.ok) return estimado
  resultado[nomes[2]] = completo ? { estado: 'completo', resultado: saldo.valor, estimadoCentavos: estimado.valor, contribuicoes: [...entradas, ...saidas].map(r => r.chave), readTime: t.valor.readTime } : { estado: 'indisponivel', motivo: 'paginasIncompletas' }
  if (q.base === 'caixa') resultado.saldoBancario = { estado: 'indisponivel', motivo: 'prerequisitosSaldoAusentes' }
  return sucesso({ competencia: q.inicio, base: q.base, indicadores: Object.freeze(resultado) })
}
