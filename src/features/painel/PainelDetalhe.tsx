import { Link } from 'react-router'
import type { ContribuicaoPainel } from '../../domain/finance/contracts/painel'
import { moedaPainel, nomesBases } from './painelPresentation'

export function PainelDetalhe({ linhas, readTime }: Readonly<{ linhas: readonly ContribuicaoPainel[]; readTime: string }>) {
  return <details><summary>Ver lançamentos deste recorte</summary><p>Mesmo momento de consulta dos indicadores: {readTime}</p><div className="painel-tabela"><table><caption>Lançamentos que explicam os indicadores</caption><thead><tr><th scope="col">Origem</th><th scope="col">Data</th><th scope="col">Valor</th><th scope="col">Base</th><th scope="col">Situação do valor</th></tr></thead><tbody>{linhas.map(l => {
    const rota = l.autoridade === 'externo' ? `/app/lancamentos/${encodeURIComponent(l.origemId)}` : l.autoridade === 'fatura' && l.cartaoId ? `/app/cartoes/${encodeURIComponent(l.cartaoId)}/faturas/${l.competencia}` : undefined
    const nome = l.autoridade === 'fatura' ? 'Fatura de cartão' : l.autoridade === 'parcelaExterna' ? 'Parcela externa' : l.autoridade === 'ocorrenciaExterna' ? 'Ocorrência recorrente' : l.autoridade === 'fato' ? 'Movimento efetivo' : l.autoridade === 'compra' ? 'Compra' : l.autoridade === 'efeito008' ? 'Ajuste da despesa' : 'Lançamento externo'
    return <tr key={l.chave}><th scope="row">{rota ? <Link to={rota}>{nome}</Link> : nome}</th><td>{l.dataFinanceira}</td><td>{moedaPainel(l.valorCentavos)}</td><td>{nomesBases[l.base]}</td><td>{l.estimado ? 'Estimado' : 'Confirmado'} · {l.fonte === 'virtual' ? 'Virtual' : 'Persistido'}</td></tr>
  })}</tbody></table></div>{!linhas.length && <p>Nenhum lançamento carregado neste recorte.</p>}</details>
}
