import { competencia, competenciaDaData, dataCalendario } from './calendar'
import { falha, registro, sucesso, texto, versaoValida, umDe } from './errors'
import type { Resultado } from './errors'
import { diferencaMonetaria, somarCentavos, subtrairCentavos, valorPositivo } from './money'
import type { Centavos, Diferenca } from './money'
import { idValido, referenciaValida, validarFatos } from './settlement'
import type { DadosPeriodo } from './contracts/commands'

export type ItemProjecao = Readonly<{ id: string; origemId: string; fonte: 'origem' | 'compromisso' | 'receita' | 'estorno' | 'fato' | 'creditoFatura'; natureza: 'entrada' | 'saida'; valorCentavos: number; competencia: string; categoriaId?: string }>
type TotalPeriodo = Readonly<{ entradasCentavos: Centavos; saidasCentavos: Centavos; resultado: Diferenca; consumoLiquido?: { natureza: 'gastos' | 'reducoesSuperioresAosGastos' | 'equilibrio'; magnitudeCentavos: Centavos } }>
export type ProjecaoPeriodo = Readonly<{ baseTemporal: 'consumo' | 'planejamento' | 'caixa'; itens: readonly ItemProjecao[] }> & (
  | Readonly<{ completo: true; totalDefinitivo: TotalPeriodo }>
  | Readonly<{ completo: false; motivos: readonly string[] }>
)
export function projetarPeriodo(base: unknown, intervalo: unknown, input: unknown): Resultado<ProjecaoPeriodo> {
  if (!umDe(base, ['consumo', 'planejamento', 'caixa']) || !registro(intervalo) || !competencia(intervalo.inicio).ok || !competencia(intervalo.fim).ok || (intervalo.inicio as string) > (intervalo.fim as string)) return falha('dataInvalida', 'Informe a base e um intervalo de competências válido.')
  if (!registro(input) || !idValido(input.uid) || !registro(input.revisao) || !versaoValida(input.revisao.antes) || !versaoValida(input.revisao.depois) || typeof input.completo !== 'boolean' || !['origens', 'compromissos', 'receitas', 'fatos', 'estornos', 'creditos'].every(key => Array.isArray(input[key]))) return falha('referenciaInvalida', 'Informe os dados completos do período.')
  const data = input as unknown as DadosPeriodo
  const invalid = () => falha('referenciaInvalida', 'Há referências ou valores inconsistentes no período.')
  for (const collection of [data.origens, data.compromissos, data.receitas, data.estornos, data.creditos]) {
    const ids = new Set<string>()
    for (const row of collection) {
      if (!registro(row) || !idValido(row.id) || row.uid !== data.uid || ids.has(row.id)) return invalid()
      ids.add(row.id)
    }
  }
  const facts = validarFatos(data.fatos, data.uid)
  if (!facts.ok) return facts
  const motivos: string[] = []
  if (!data.completo) motivos.push('paginasIncompletas')
  if (data.revisao.antes !== data.revisao.depois) motivos.push('revisaoAlterada')
  const items: ItemProjecao[] = []
  const add = (entry: ItemProjecao) => { if (entry.competencia >= (intervalo.inicio as string) && entry.competencia <= (intervalo.fim as string)) items.push(entry) }
  for (const origin of data.origens) {
    if (!['compra', 'obrigacaoExterna'].includes(origin.tipo) || !['nova', 'migrada'].includes(origin.origemDados) || !idValido(origin.categoriaId) || (origin.estadoObrigacao !== undefined && !['ativa', 'cancelada'].includes(origin.estadoObrigacao)) || (origin.etiquetaIds !== undefined && (!Array.isArray(origin.etiquetaIds) || origin.etiquetaIds.length > 5 || new Set(origin.etiquetaIds).size !== origin.etiquetaIds.length || !origin.etiquetaIds.every(idValido)))) return invalid()
    if (origin.valorTotalCentavos === undefined || origin.dataConsumo === undefined) {
      if (origin.origemDados !== 'migrada' || !valorPositivo(origin.saldoMigradoCentavos).ok) return invalid()
      if (base === 'consumo') motivos.push(origin.dataConsumo === undefined ? 'semDataConsumo' : 'totalOriginalDesconhecido')
      continue
    }
    const period = competenciaDaData(origin.dataConsumo)
    if (!period.ok || !valorPositivo(origin.valorTotalCentavos).ok) return invalid()
    if (base === 'consumo') add({ id: origin.id, origemId: origin.id, fonte: 'origem', natureza: 'saida', valorCentavos: origin.valorTotalCentavos, competencia: period.valor, categoriaId: origin.categoriaId })
  }
  for (const credit of data.creditos) {
    if (!valorPositivo(credit.valorCentavos).ok || !dataCalendario(credit.dataEfeito).ok || !idValido(credit.origemId) || !idValido(credit.operacaoId) || !texto(credit.motivo, 1000) || credit.tipo !== 'creditoObrigacao' || credit.schemaVersion !== 1 || credit.version !== 1 || !referenciaValida(credit.alvo)) return invalid()
    const knownTarget = credit.alvo.tipo === 'receita' ? data.receitas.some(r => r.id === credit.alvo.id && credit.origemId === r.id)
      : credit.alvo.tipo === 'fatura' ? data.compromissos.some(c => c.faturaId === credit.alvo.id && c.origemId === credit.origemId)
      : data.compromissos.some(c => c.id === credit.alvo.id && c.tipo === credit.alvo.tipo && c.origemId === credit.origemId)
    if (!knownTarget) return invalid()
  }
  for (const commitment of data.compromissos) {
    if (!['obrigacaoExternaAvulsa', 'parcelaExterna', 'parcelaCartao'].includes(commitment.tipo) || !['ativa', 'cancelada'].includes(commitment.estadoObrigacao) || !idValido(commitment.origemId) || !valorPositivo(commitment.valorCentavos).ok || !competencia(commitment.competenciaPlanejamento).ok || !dataCalendario(commitment.vencimento).ok || (commitment.tipo === 'parcelaCartao' ? !idValido(commitment.faturaId) || commitment.vencimento.slice(0, 7) !== commitment.competenciaPlanejamento : commitment.faturaId !== undefined)) return invalid()
    if (!data.origens.some(o => o.id === commitment.origemId && o.tipo === (commitment.tipo === 'parcelaCartao' ? 'compra' : 'obrigacaoExterna'))) return invalid()
    const credits = somarCentavos(data.creditos.filter(c => c.alvo.tipo === commitment.tipo && c.alvo.id === commitment.id).map(c => c.valorCentavos))
    if (!credits.ok) return credits
    const net = subtrairCentavos(commitment.valorCentavos, credits.valor)
    if (!net.ok) return net
    if (base === 'planejamento' && commitment.estadoObrigacao === 'ativa') add({ id: commitment.id, origemId: commitment.origemId, fonte: 'compromisso', natureza: 'saida', valorCentavos: net.valor, competencia: commitment.competenciaPlanejamento, categoriaId: data.origens.find(o => o.id === commitment.origemId)?.categoriaId })
  }
  for (const receipt of data.receitas) {
    if (!valorPositivo(receipt.valorCentavos).ok || !competencia(receipt.competenciaPlanejamento).ok || !dataCalendario(receipt.dataPrevista).ok || typeof receipt.estimado !== 'boolean' || !['ativa', 'cancelada'].includes(receipt.estadoObrigacao)) return invalid()
    const credits = somarCentavos(data.creditos.filter(c => c.alvo.tipo === 'receita' && c.alvo.id === receipt.id).map(c => c.valorCentavos))
    if (!credits.ok) return credits
    const net = subtrairCentavos(receipt.valorCentavos, credits.valor)
    if (!net.ok) return net
    if (base === 'planejamento' && receipt.estadoObrigacao === 'ativa') add({ id: receipt.id, origemId: receipt.id, fonte: 'receita', natureza: 'entrada', valorCentavos: net.valor, competencia: receipt.competenciaPlanejamento })
  }
  for (const credit of data.creditos.filter(c => c.alvo.tipo === 'fatura')) {
    const candidates = data.compromissos.filter(c => c.faturaId === credit.alvo.id)
    if (!candidates.length || candidates.some(c => c.competenciaPlanejamento !== candidates[0].competenciaPlanejamento)) return invalid()
    const sum = somarCentavos(candidates.filter(c => c.estadoObrigacao === 'ativa').map(c => c.valorCentavos))
    const discounts = somarCentavos(data.creditos.filter(c => c.alvo.tipo === 'fatura' && c.alvo.id === credit.alvo.id || c.alvo.tipo === 'parcelaCartao' && candidates.some(p => p.id === c.alvo.id && p.estadoObrigacao === 'ativa')).map(c => c.valorCentavos))
    if (!sum.ok) return sum
    if (!discounts.ok) return discounts
    if (!subtrairCentavos(sum.valor, discounts.valor).ok) return invalid()
    if (base === 'planejamento') add({ id: credit.id, origemId: credit.origemId, fonte: 'creditoFatura', natureza: 'entrada', valorCentavos: credit.valorCentavos, competencia: candidates[0].competenciaPlanejamento })
  }
  for (const reversal of data.estornos) {
    const origin = data.origens.find(o => o.id === reversal.origemId && o.tipo === reversal.origemTipo)
    const period = competenciaDaData(reversal.dataEfeito)
    if (!origin || !period.ok || !valorPositivo(reversal.valorCentavos).ok || !texto(reversal.motivo, 1000) || !idValido(reversal.operacaoId) || (origin.dataConsumo !== undefined && reversal.dataEfeito < origin.dataConsumo)) return invalid()
    const reversed = somarCentavos(data.estornos.filter(e => e.origemId === origin.id && e.origemTipo === origin.tipo).map(e => e.valorCentavos))
    if (!reversed.ok) return reversed
    if (origin.valorTotalCentavos === undefined || reversed.valor > origin.valorTotalCentavos) return invalid()
    if (base === 'consumo') add({ id: reversal.id, origemId: origin.id, fonte: 'estorno', natureza: 'entrada', valorCentavos: reversal.valorCentavos, competencia: period.valor, categoriaId: origin.categoriaId })
  }
  if (base === 'caixa') for (const fact of facts.valor) {
    const period = competenciaDaData(fact.dataEfetiva)
    if (!period.ok) return period
    add({ id: fact.id, origemId: fact.alvo.id, fonte: 'fato', natureza: ['recebimento', 'reversaoPagamento', 'reembolso'].includes(fact.tipo) ? 'entrada' : 'saida', valorCentavos: fact.valorCentavos, competencia: period.valor })
  }
  const baseTemporal = base as 'consumo' | 'planejamento' | 'caixa'
  if (motivos.length) return sucesso({ baseTemporal, itens: items, completo: false, motivos: [...new Set(motivos)] })
  const income = somarCentavos(items.filter(i => i.natureza === 'entrada').map(i => i.valorCentavos)), expense = somarCentavos(items.filter(i => i.natureza === 'saida').map(i => i.valorCentavos))
  if (!income.ok) return income
  if (!expense.ok) return expense
  const difference = diferencaMonetaria(income.valor, expense.valor)
  if (!difference.ok) return difference
  return sucesso({ baseTemporal, itens: items, completo: true, totalDefinitivo: { entradasCentavos: income.valor, saidasCentavos: expense.valor, resultado: difference.valor, ...(base === 'consumo' ? { consumoLiquido: { natureza: difference.valor.natureza === 'superavit' ? 'reducoesSuperioresAosGastos' as const : difference.valor.natureza === 'deficit' ? 'gastos' as const : 'equilibrio' as const, magnitudeCentavos: difference.valor.magnitudeCentavos } } : {}) } })
}
