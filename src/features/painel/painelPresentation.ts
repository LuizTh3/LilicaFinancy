import type { BasePainel, IndicadorPainel } from '../../domain/finance/contracts/painel'
import { formatarBRL } from '../../domain/finance/money'

export const nomesBases: Readonly<Record<BasePainel, string>> = { planejamento: 'Planejamento por competência', caixa: 'Caixa por data efetiva', consumo: 'Consumo por data da despesa' }
export const indicadoresPorBase: Readonly<Record<BasePainel, readonly string[]>> = {
  planejamento: ['receitasPrevistas', 'recebidoDasReceitas', 'aReceber', 'compromissos', 'liquidadoDosCompromissos', 'pendente', 'resultadoPrevisto'],
  caixa: ['entradasCaixa', 'saidasCaixa', 'variacaoCaixa', 'saldoBancario'], consumo: ['despesasConsumo', 'reducoesConsumo', 'consumoLiquido'],
}
export const rotulosIndicadores: Readonly<Record<string, string>> = { receitasPrevistas: 'Receitas previstas', recebidoDasReceitas: 'Recebido das receitas previstas', aReceber: 'A receber', compromissos: 'Compromissos totais', liquidadoDosCompromissos: 'Pagamentos dos compromissos', pendente: 'Pendências', resultadoPrevisto: 'Resultado previsto', entradasCaixa: 'Entradas de caixa', saidasCaixa: 'Saídas de caixa', variacaoCaixa: 'Variação de caixa no período', saldoBancario: 'Saldo bancário calculado', despesasConsumo: 'Despesas de consumo', reducoesConsumo: 'Reduções de consumo', consumoLiquido: 'Consumo líquido' }
export const moedaPainel = (v: number) => { const moeda = formatarBRL(v); return moeda.ok ? moeda.valor : 'Indisponível' }
export function textoIndicadorPainel(indicador?: IndicadorPainel): string {
  if (!indicador || indicador.estado === 'indisponivel') return 'Indisponível'
  if (indicador.estado === 'erro') return 'Erro ao consultar'
  if (indicador.estado === 'parcial') return `Subtotal parcial: ${moedaPainel(indicador.subtotalCentavos)}`
  if (indicador.resultado) return `${indicador.resultado.natureza === 'deficit' ? '−' : ''}${moedaPainel(indicador.resultado.magnitudeCentavos)}`
  return moedaPainel(indicador.valorCentavos)
}
