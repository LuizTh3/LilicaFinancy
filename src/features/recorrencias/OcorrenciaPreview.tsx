import type { LinhaProjecaoRecorrente } from '../../domain/finance/contracts/recorrencias'
import { formatarBRL } from '../../domain/finance/money'

export function OcorrenciaPreview({ linhas, completo }: Readonly<{ linhas: readonly LinhaProjecaoRecorrente[]; completo: boolean }>) {
  return <section aria-label="Prévia das ocorrências"><h2>Ocorrências mensais</h2><p>{completo ? 'Período reconciliado' : 'Prévia parcial: existem fontes ou slots pendentes.'}</p><p>Virtual ou persistida indica a origem. Estimado ou confirmado indica o valor. Gerar ou confirmar valor não registra pagamento ou recebimento.</p>
    {!linhas.length && <p>{completo ? 'Nenhuma ocorrência no período consultado.' : 'Nenhuma ocorrência carregada até aqui.'}</p>}
    <table><caption>Prévia por série e mês</caption><thead><tr><th scope="col">Mês de referência</th><th scope="col">Descrição</th><th scope="col">Valor</th><th scope="col">Origem</th><th scope="col">Estado</th><th scope="col">Destino</th></tr></thead><tbody>{linhas.map(o => {
      const f = o.financeiro, valor = f ? formatarBRL(f.valorCentavos) : undefined
      return <tr key={o.id}><th scope="row">{o.mesReferencia}</th><td>{f?.descricao ?? 'Ocorrência suprimida'}</td><td>{valor?.ok ? valor.valor : 'Sem obrigação'}{f ? f.estimado ? ' · Estimado' : ' · Confirmado' : ''}</td><td>{o.fonte === 'virtual' ? 'Virtual' : 'Persistida'}</td><td>{{ virtual: 'Prevista', persistida: 'Registrada', pulada: 'Pulada', cancelada: 'Cancelada' }[o.estado]}</td><td>{f && 'faturaId' in f ? `Assinatura · Fatura ${f.competenciaFatura}` : f && 'competenciaPlanejamento' in f ? `Externa · Competência ${f.competenciaPlanejamento}` : 'Sem lançamento financeiro'}</td></tr>
    })}</tbody></table>
  </section>
}
