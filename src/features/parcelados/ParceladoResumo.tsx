import type { SerieParcelada } from '../../domain/finance/contracts/parcelados'
import { resumirSerieParcelada } from '../../domain/finance/parceladosSummary'
import { formatarBRL } from '../../domain/finance/money'

const moeda = (v: number) => { const m = formatarBRL(v); return m.ok ? m.valor : 'Indisponível' }
export function ParceladoResumo({ serie, uid, hoje }: Readonly<{ serie: SerieParcelada; uid: string; hoje: string }>) {
  const resumo = resumirSerieParcelada(serie, { uid, hoje })
  if (!resumo.ok) return <p role="alert">Cronograma indisponível. Recarregue os dados completos.</p>
  const r = resumo.valor
  return <section aria-label="Cronograma e posição financeira"><h2>{serie.tipo === 'emprestimo' ? 'Empréstimo' : 'Compromisso parcelado externo'}: {serie.descricao}</h2>
    {r.anterioresNaoCadastradas > 0 && <p>Posições anteriores: {r.anterioresNaoCadastradas} não cadastradas. Não há quitação ou pagamentos presumidos.</p>}
    <dl><dt>Valor original do contrato</dt><dd>{r.valorOriginalCentavos === undefined ? 'Não informado' : moeda(r.valorOriginalCentavos)}</dd><dt>Compromissos ativos — planejamento por competência</dt><dd>{moeda(r.planejadoAtivoCentavos)}</dd><dt>Liquidado líquido — acumulado vinculado às parcelas</dt><dd>{moeda(r.liquidadoLiquidoCentavos)}</dd><dt>Pendência atual</dt><dd>{moeda(r.pendenteCentavos)}</dd></dl>
    <p>Pagamentos não retiram parcelas do total planejado. Valores acumulados não são o fluxo de caixa de um mês nem saldo bancário.</p>
    {serie.receitaVinculadaId && <p>Existe receita explicitamente vinculada. Seu recebimento e valor são consultados separadamente.</p>}
    {serie.substituiSerieId && <p>Esta série substitui obrigações de outra série por acordo explícito.</p>}
    <table><caption>Obrigações cadastradas</caption><thead><tr><th scope="col">Parcela</th><th scope="col">Valor</th><th scope="col">Competência</th><th scope="col">Vencimento</th><th scope="col">Liquidado líquido</th><th scope="col">Pendente</th><th scope="col">Situação</th></tr></thead><tbody>{r.linhas.map(p => <tr key={p.numero}><th scope="row">{p.numero} de {p.quantidadeOriginal}</th><td>{moeda(p.valorCentavos)}</td><td>{p.competenciaPlanejamento}</td><td>{p.vencimento}</td><td>{moeda(p.liquidadoLiquidoCentavos)}</td><td>{moeda(p.pendenteCentavos)}</td><td>{{ cancelada: 'Cancelada', liquidada: 'Liquidada', parcial: 'Parcialmente paga', pendente: 'Pendente' }[p.situacao]}{p.atrasada ? ' · Em atraso' : ''}{p.jaLiquidada && p.liquidadoLiquidoCentavos === 0 ? ' · Histórico de liquidação preservado' : ''}</td></tr>)}</tbody></table>
  </section>
}
