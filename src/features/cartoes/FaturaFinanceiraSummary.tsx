import { formatarBRL } from '../../domain/finance/money'
import { resumirControleFatura } from '../../domain/finance/liquidacoesFaturas'
import type { ControleFatura, ContextoLiquidacaoFatura } from '../../domain/finance/contracts/liquidacoesFaturas'

export function FaturaFinanceiraSummary({ controle, contexto }: Readonly<{ controle: ControleFatura; contexto: ContextoLiquidacaoFatura }>) {
  const resumo = resumirControleFatura(controle, contexto)
  if (!resumo.ok) return <p role="alert">Posição financeira indisponível. Recarregue a fatura completa.</p>
  const r = resumo.valor
  const moeda = (v: number) => { const f = formatarBRL(v); return f.ok ? f.valor : 'indisponível' }
  return <section aria-label="Posição financeira da fatura"><h2>Posição financeira</h2><dl><dt>Compromisso líquido — planejamento por competência da fatura</dt><dd>{moeda(r.exigivelCentavos)}</dd><dt>Pagamentos líquidos vinculados à fatura</dt><dd>{moeda(r.liquidadoLiquidoCentavos)}</dd><dt>Pendência</dt><dd>{moeda(r.pendenteCentavos)}</dd><dt>Liquidação</dt><dd>{{ semExigibilidade: 'Sem exigibilidade', pendente: 'Pendente', parcial: 'Parcialmente paga', liquidada: 'Liquidada' }[r.estadoLiquidacao]}</dd><dt>Atraso</dt><dd>{r.atrasada ? 'Em atraso' : 'Sem atraso'}</dd><dt>Revisão</dt><dd>{r.revisaoEstado === 'reaberta' ? 'Reaberta explicitamente' : 'Normal'}</dd></dl><p>Pagamentos não removem compromissos do planejamento. Esta posição não representa saldo bancário.</p></section>
}
