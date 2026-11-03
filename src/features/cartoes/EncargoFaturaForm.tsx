import { useState } from 'react'
import type { FormEvent } from 'react'
import { interpretarBRL } from '../../domain/finance/money'

type Dados = Readonly<{ valorCentavos: number; categoriaId: string; descricao: string; motivo: string; dataEfeito: string; tipoJurosOuEncargo: 'juros' | 'encargo' }>
export function EncargoFaturaForm({ busy, hoje, categorias, onPreview, onInvalidate }: Readonly<{ busy: boolean; hoje: string; categorias: readonly { id: string; nome: string }[]; onPreview: (dados: Dados) => void; onInvalidate: () => void }>) {
  const [valor, setValor] = useState(''), [categoria, setCategoria] = useState(''), [descricao, setDescricao] = useState(''), [motivo, setMotivo] = useState(''), [data, setData] = useState(hoje), [tipo, setTipo] = useState<'juros' | 'encargo'>('encargo'), [erro, setErro] = useState('')
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    const v = interpretarBRL(valor)
    if (!v.ok || !v.valor || !categorias.some(c => c.id === categoria) || !descricao.trim() || !motivo.trim() || !data || data > hoje) { setErro('Confira valor, categoria, descrição, motivo e data.'); return }
    setErro('')
    onPreview({ valorCentavos: v.valor, categoriaId: categoria, descricao: descricao.trim(), motivo: motivo.trim(), dataEfeito: data, tipoJurosOuEncargo: tipo })
  }
  return <form onSubmit={submit} onChange={() => { onInvalidate(); setErro('') }}><h2>Registrar encargo informado</h2><p>Informe o valor da fatura. Não há cálculo automático de juros, taxa ou pagamento.</p>{erro && <p role="alert">{erro}</p>}<fieldset disabled={busy}><legend>Dados do encargo</legend>
    <label>Tipo<select value={tipo} onChange={e => setTipo(e.target.value as 'juros' | 'encargo')}><option value="encargo">Encargo</option><option value="juros">Juros informados</option></select></label>
    <label>Valor em reais<input required inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} /></label>
    <label>Categoria<select required value={categoria} onChange={e => setCategoria(e.target.value)}><option value="">Selecione</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
    <label>Descrição<input required maxLength={120} value={descricao} onChange={e => setDescricao(e.target.value)} /></label>
    <label>Motivo<textarea required maxLength={1000} value={motivo} onChange={e => setMotivo(e.target.value)} /></label>
    <label>Data de efeito<input required type="date" min="1900-01-01" max={hoje} value={data} onChange={e => setData(e.target.value)} /></label>
    <button>Conferir encargo</button></fieldset></form>
}
