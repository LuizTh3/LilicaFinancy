import type { PreviaCriacaoParcelada } from '../../domain/finance/contracts/parcelados'
import { formatarBRL } from '../../domain/finance/money'
const dinheiro = (v: number) => { const r = formatarBRL(v); return r.ok ? r.valor : 'Valor indisponível' }
export function CronogramaPreview({ previa }: { previa: PreviaCriacaoParcelada }) {
  return <section aria-label="Prévia do cronograma">
    <h2>Confira as obrigações</h2>
    <dl><dt>Valor original</dt><dd>{previa.dados.valorOriginalCentavos === undefined ? 'Não informado' : dinheiro(previa.dados.valorOriginalCentavos)}</dd><dt>Soma cadastrada</dt><dd>{dinheiro(previa.totalCadastradoCentavos)}</dd></dl>
    <p>Este cadastro não registra pagamentos nem entrada de dinheiro. As parcelas anteriores à próxima informada não são cadastradas.</p>
    <table><caption>Cronograma informado</caption><thead><tr><th scope="col">Parcela</th><th scope="col">Valor</th><th scope="col">Vencimento</th><th scope="col">Competência do planejamento</th></tr></thead><tbody>{Object.values(previa.dados.parcelas).map(p => <tr key={p.numero}><th scope="row">{p.numero} de {p.quantidadeOriginal}</th><td>{dinheiro(p.valorCentavos)}</td><td>{p.vencimento}</td><td>{p.competenciaPlanejamento}</td></tr>)}</tbody></table>
  </section>
}
