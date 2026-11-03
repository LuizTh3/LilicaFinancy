import { Link, useSearchParams } from 'react-router'
import { useSession } from '../../app/session/useSession'
import { avancarCompetencia, competencia } from '../../domain/finance/calendar'
import type { BasePainel, JanelaPainel, PaginaPainel } from '../../domain/finance/contracts/painel'
import { basesPainel } from '../../domain/finance/contracts/painel'
import { useHoje } from '../cartoes/useHoje'
import { PainelIndicadores } from './PainelIndicadores'
import { PainelDetalhe } from './PainelDetalhe'
import { indicadoresPorBase, nomesBases, rotulosIndicadores, textoIndicadorPainel } from './painelPresentation'

export function PainelPage() { return <PainelRota modo="mensal" /> }
export function PainelRota({ modo }: Readonly<{ modo: 'mensal' | '12meses' }>) {
  const session = useSession(), hoje = useHoje(session.timezone ?? 'America/Rio_Branco'), [params] = useSearchParams()
  if (!session.user || !session.generation || !hoje) return <output>Carregando período…</output>
  const solicitado = params.get('mes'), inicio = competencia(solicitado).ok ? solicitado! : hoje.slice(0, 7)
  const base = basesPainel.includes(params.get('base') as BasePainel) ? params.get('base') as BasePainel : 'planejamento'
  const retorno = competencia(params.get('retorno')).ok ? params.get('retorno')! : inicio
  return <PainelVisao key={`${session.user.uid}:${session.generation}:${session.timezone}`} modo={modo} inicio={inicio} base={base} retorno={retorno} />
}

/** Pure view. Runtime sources remain disabled until authenticated snapshot/source gates pass. */
export function PainelVisao({ modo, inicio, base, retorno = inicio, janela, pagina }: Readonly<{ modo: 'mensal' | '12meses'; inicio: string; base: BasePainel; retorno?: string; janela?: JanelaPainel; pagina?: PaginaPainel }>) {
  const fim = avancarCompetencia(inicio, modo === 'mensal' ? 0 : 11)
  if (!fim.ok) return <section><h1>Período fora do calendário</h1><p>Escolha um início que permita exibir todos os meses.</p><Link to="/app">Voltar ao painel mensal</Link></section>
  const rota = modo === 'mensal' ? '/app' : '/app/projecao'
  const link = (mes: string, b = base) => `${rota}?mes=${mes}&base=${b}${modo === 'mensal' ? `&retorno=${retorno}` : ''}`
  const meses = Array.from({ length: modo === 'mensal' ? 1 : 12 }, (_, i) => { const m = avancarCompetencia(inicio, i); return m.ok ? m.valor : '' })
  const compativel = janela?.consulta.base === base && janela.consulta.inicio === inicio && janela.consulta.fim === fim.valor && janela.consulta.modo === modo && Object.keys(janela.consulta.filtros).length === 0 && janela.meses.length === meses.length && janela.meses.every((m, i) => m.competencia === meses[i] && m.base === base)
  const dados = compativel ? janela : undefined
  const detalhes = dados && pagina && pagina.snapshot.uid === dados.snapshot.uid && pagina.snapshot.generation === dados.snapshot.generation && pagina.snapshot.readTime === dados.snapshot.readTime && JSON.stringify(pagina.consulta) === JSON.stringify(dados.consulta) ? pagina : undefined
  return <section className="painel-page"><h1>{modo === 'mensal' ? 'Painel mensal' : 'Projeção de 12 meses'}</h1>
    <form key={`${inicio}:${base}`} className="cadastro-actions" method="get">{modo === 'mensal' && <input type="hidden" name="retorno" value={retorno} />}<label>{modo === 'mensal' ? 'Mês' : 'Primeiro mês'}<input type="month" name="mes" required min="1900-01" max={modo === 'mensal' ? '9999-12' : '9999-01'} defaultValue={inicio} /></label><label>Base dos indicadores<select name="base" defaultValue={base}>{basesPainel.map(b => <option key={b} value={b}>{nomesBases[b]}</option>)}</select></label><button type="submit">Exibir período</button></form>
    <nav className="cadastro-actions" aria-label="Navegar períodos">{[-12, -1, 1, 12].map(n => {
      const alvo = avancarCompetencia(inicio, n), ultimo = alvo.ok ? avancarCompetencia(alvo.valor, modo === 'mensal' ? 0 : 11) : alvo
      return alvo.ok && ultimo.ok ? <Link key={n} to={link(alvo.valor)}>{n < 0 ? 'Voltar' : 'Avançar'} {Math.abs(n) === 1 ? '1 mês' : '12 meses'}</Link> : <span key={n}>{n < 0 ? 'Início do calendário' : 'Fim do calendário'}</span>
    })}{modo === 'mensal' ? <Link to={`/app/projecao?mes=${retorno}&base=${base}`}>Ver 12 meses</Link> : <Link to={`/app?mes=${inicio}&base=${base}&retorno=${inicio}`}>Abrir primeiro mês</Link>}</nav>
    <p><strong>Base: {nomesBases[base]}.</strong> {base === 'planejamento' ? 'Recebimentos e pagamentos exibidos são os vinculados às obrigações deste recorte, mesmo quando ocorreram em outro mês.' : base === 'caixa' ? 'Somente movimentos por data de recebimento ou pagamento. Reembolso é entrada de caixa, não nova receita.' : 'Despesas por data de origem e ajustes pela data de efeito aplicável. Parcelas não repetem o consumo da compra.'}</p>
    <p>Resultado previsto não é saldo bancário nem garantia de dinheiro disponível. O saldo calculado exige saldo inicial válido, data-base e movimentos completos de conta.</p>
    {!dados ? <output>Os dados consolidados ainda estão indisponíveis. Ausência de informação não representa valor zero.</output> : <output>{dados.completo ? 'Período reconciliado' : 'Período parcial: existem fontes ou páginas pendentes.'} · Consulta: {dados.snapshot.readTime}</output>}
    {modo === 'mensal' ? <><h2>{inicio}</h2><PainelIndicadores base={base} resumo={dados?.meses[0]} /></> : <section className="painel-tabela" aria-label="Comparação de doze meses"><table><caption>{inicio} a {fim.valor} · {nomesBases[base]}</caption><thead><tr><th scope="col">Mês</th>{indicadoresPorBase[base].map(n => <th scope="col" key={n}>{rotulosIndicadores[n]}</th>)}</tr></thead><tbody>{meses.map((mes, i) => <tr key={mes}><th scope="row"><Link to={`/app?mes=${mes}&base=${base}&retorno=${inicio}`}>{mes}</Link></th>{indicadoresPorBase[base].map(n => { const valor = dados?.meses[i]?.indicadores[n]; return <td key={n}>{textoIndicadorPainel(valor)}{valor?.estado === 'completo' && valor.estimadoCentavos > 0 && <small>Inclui estimativas</small>}</td> })}</tr>)}</tbody></table></section>}
    <p>Filtros por titular, cartão, categoria e etiqueta ainda estão indisponíveis nesta visão. Totais e pendência de fatura não são repartidos por categoria ou etiqueta.</p>
    {detalhes && <PainelDetalhe linhas={detalhes.contribuicoes} readTime={detalhes.snapshot.readTime} />}
  </section>
}
