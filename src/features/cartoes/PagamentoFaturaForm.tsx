import { useState } from 'react'
import type { FormEvent } from 'react'
import { formatarBRL, interpretarBRL } from '../../domain/finance/money'

type Conta = Readonly<{ id: string; nome: string }>
type Props = Readonly<{ busy: boolean; hoje: string; pendenteCentavos: number; contas: readonly Conta[]; onPreview: (dados: Readonly<{ valorCentavos: number; contaId: string; dataEfetiva: string }>) => void; onInvalidate: () => void }>
export function PagamentoFaturaForm({ busy, hoje, pendenteCentavos, contas, onPreview, onInvalidate }: Props) {
  const [valor, setValor] = useState(''), [conta, setConta] = useState(''), [data, setData] = useState(hoje), [erro, setErro] = useState('')
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    const dinheiro = interpretarBRL(valor)
    if (!dinheiro.ok || !dinheiro.valor || dinheiro.valor > pendenteCentavos || !contas.some(c => c.id === conta) || !data || data > hoje) { setErro('Confira valor, conta e data. O pagamento não pode exceder a pendência.'); return }
    setErro('')
    onPreview({ valorCentavos: dinheiro.valor, contaId: conta, dataEfetiva: data })
  }
  const pendente = formatarBRL(pendenteCentavos)
  return <form onSubmit={submit} onChange={() => { onInvalidate(); setErro('') }}>
    <h2>Pagamento da fatura</h2><p>Pendência: {pendente.ok ? pendente.valor : 'indisponível'}. O pagamento mantém o total planejado e não quita parcelas individualmente.</p>
    {erro && <p role="alert">{erro}</p>}
    <fieldset disabled={busy || pendenteCentavos <= 0}><legend>Conta, valor e data do pagamento</legend>
      <label>Valor pago em reais<input required inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" /></label>
      <label>Conta pagadora<select required value={conta} onChange={e => setConta(e.target.value)}><option value="">Selecione</option>{contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
      <label>Data do pagamento<input required type="date" min="1900-01-01" max={hoje} value={data} onChange={e => setData(e.target.value)} /></label>
      <button type="submit">Conferir pagamento</button>
    </fieldset>
  </form>
}
