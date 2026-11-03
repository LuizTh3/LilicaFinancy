import { useState } from 'react'
import type { FormEvent } from 'react'
import { interpretarBRL } from '../../domain/finance/money'

type Opcao = Readonly<{ id: string; nome: string }>
export function RecorrenciaForm({ busy, categorias, cartoes, titulares, contas, onPreview, onInvalidate }: Readonly<{ busy: boolean; categorias: readonly Opcao[]; cartoes: readonly Opcao[]; titulares: readonly Opcao[]; contas: readonly Opcao[]; onPreview: (input: unknown) => void; onInvalidate: () => void }>) {
  const [natureza, setNatureza] = useState('despesaExterna'), [descricao, setDescricao] = useState(''), [inicio, setInicio] = useState(''), [termino, setTermino] = useState(''), [dia, setDia] = useState('1'), [valor, setValor] = useState(''), [estimado, setEstimado] = useState(false), [categoria, setCategoria] = useState(''), [cartao, setCartao] = useState(''), [titular, setTitular] = useState(''), [conta, setConta] = useState(''), [erro, setErro] = useState('')
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    const v = interpretarBRL(valor)
    if (!v.ok || !v.valor || !categorias.some(c => c.id === categoria) || natureza === 'assinaturaCartao' && !cartoes.some(c => c.id === cartao)) { setErro('Confira valor, categoria e cartão quando aplicável.'); return }
    onPreview({ natureza, descricao: descricao.trim(), inicio, ...(termino ? { terminoOriginal: termino } : {}), diaAncora: Number(dia), valorCentavos: v.valor, estimado, categoriaId: categoria, ...(natureza === 'assinaturaCartao' ? { cartaoId: cartao } : { ...(titular ? { titularId: titular } : {}), ...(conta ? { contaPrevistaId: conta } : {}) }) })
  }
  const select = (opcoes: readonly Opcao[], value: string, change: (s: string) => void, required = false) => <select required={required} value={value} onChange={e => change(e.target.value)}><option value="">Selecione</option>{opcoes.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}</select>
  return <form onSubmit={submit} onChange={() => { onInvalidate(); setErro('') }}><h2>Recorrência mensal</h2><p>A geração ocorre ao abrir o período ou por ação explícita. O aplicativo fechado não executa lançamentos.</p>{erro && <p role="alert">{erro}</p>}<fieldset disabled={busy}><legend>Padrão e vigência</legend>
    <label>Natureza<select value={natureza} onChange={e => setNatureza(e.target.value)}><option value="despesaExterna">Despesa externa</option><option value="receitaExterna">Receita externa</option><option value="assinaturaCartao">Assinatura em cartão</option></select></label>
    <label>Descrição<input required maxLength={120} value={descricao} onChange={e => setDescricao(e.target.value)} /></label>
    <label>Início<input required type="date" min="1900-01-01" max="9999-12-31" value={inicio} onChange={e => setInicio(e.target.value)} /></label>
    <label>Término opcional, inclusivo<input type="date" min={inicio || '1900-01-01'} max="9999-12-31" value={termino} onChange={e => setTermino(e.target.value)} /></label>
    <label>Dia mensal<input required type="number" min={1} max={31} value={dia} onChange={e => setDia(e.target.value)} /></label><p>Se o dia não existir no mês, será usado o último dia.</p>
    <label>Valor em reais<input required inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" /></label>
    <label><input type="checkbox" checked={estimado} onChange={e => setEstimado(e.target.checked)} />Valor estimado, a confirmar por ocorrência</label>
    <label>Categoria{select(categorias, categoria, setCategoria, true)}</label>
    {natureza === 'assinaturaCartao' ? <label>Cartão{select(cartoes, cartao, setCartao, true)}</label> : <><label>Titular opcional{select(titulares, titular, setTitular)}</label><label>Conta prevista opcional{select(contas, conta, setConta)}</label></>}
    <button type="submit">Conferir recorrência</button></fieldset></form>
}
