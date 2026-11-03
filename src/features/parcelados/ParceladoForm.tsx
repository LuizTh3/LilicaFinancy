import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Cadastro, Colecao } from '../../domain/finance/contracts/cadastros'
import { interpretarBRL } from '../../domain/finance/money'

type Props = Readonly<{ busy: boolean; opcoes: Readonly<Record<Colecao, readonly Cadastro[]>>; onPreview: (input: unknown) => void; onCancel: () => void; onInvalidate?: () => void }>
export function ParceladoForm({ busy, opcoes, onPreview, onCancel, onInvalidate }: Props) {
  const [tipo, setTipo] = useState('compromissoExterno'), [descricao, setDescricao] = useState(''), [origem, setOrigem] = useState('nova')
  const [n, setN] = useState('1'), [p, setP] = useState('1'), [modo, setModo] = useState('mensal'), [calculo, setCalculo] = useState('porParcela')
  const [valor, setValor] = useState(''), [original, setOriginal] = useState(''), [vencimento, setVencimento] = useState(''), [mes, setMes] = useState(''), [ancora, setAncora] = useState('1')
  const [categoria, setCategoria] = useState(''), [titular, setTitular] = useState(''), [conta, setConta] = useState(''), [etiquetas, setEtiquetas] = useState<string[]>([])
  const [contratacao, setContratacao] = useState(''), [consumo, setConsumo] = useState(''), [observacao, setObservacao] = useState(''), [error, setError] = useState('')
  const [linhas, setLinhas] = useState<Record<number, { valor: string; vencimento: string; competencia: string }>>({})
  const form = useRef<HTMLFormElement>(null)
  const numeros = Number.isInteger(Number(n)) && Number.isInteger(Number(p)) && Number(n) <= 12 && Number(p) >= 1 && Number(p) <= Number(n) ? Array.from({ length: Number(n) - Number(p) + 1 }, (_, i) => Number(p) + i) : []
  const dinheiro = (value: string) => { const r = interpretarBRL(value); if (!r.ok || !r.valor) throw Error('Informe valores positivos no formato 1.234,56.'); return r.valor }
  function submit(e: FormEvent) {
    e.preventDefault(); if (busy) return
    try {
      const base = { tipo, descricao, origemDados: origem, quantidadeOriginal: Number(n), numeroInicial: origem === 'nova' ? 1 : Number(p), modo, referencias: { categoriaId: categoria, ...(titular ? { titularId: titular } : {}), ...(conta ? { contaPrevistaId: conta } : {}), ...(etiquetas.length ? { etiquetaIds: etiquetas } : {}) }, ...(original.trim() ? { valorOriginalCentavos: dinheiro(original) } : {}), ...(contratacao ? { dataContratacao: contratacao } : {}), ...(consumo ? { dataConsumo: consumo } : {}), ...(observacao.trim() ? { observacao: observacao.trim() } : {}) }
      const entrada = modo === 'mensal' ? { ...base, diaAncora: Number(ancora), primeiroVencimento: vencimento, primeiraCompetencia: mes, calculo: calculo === 'total' ? { tipo: 'total', totalCentavos: dinheiro(valor) } : { tipo: 'porParcela', valorCentavos: dinheiro(valor) } } : { ...base, calculo: { tipo: 'explicito' }, cronograma: numeros.map(numero => ({ numero, valorCentavos: dinheiro(linhas[numero]?.valor ?? ''), vencimento: linhas[numero]?.vencimento ?? '', competenciaPlanejamento: linhas[numero]?.competencia ?? '' })) }
      setError(''); onPreview(entrada)
    } catch { setError('Confira valores positivos e todas as linhas do cronograma. Use o formato 1.234,56.'); form.current?.querySelector<HTMLInputElement>('input[name="valor"], input[name="descricao"]')?.focus() }
  }
  const select = (c: Colecao, value: string, change: (v: string) => void, required = false) => <select required={required} disabled={busy} value={value} onChange={e => change(e.target.value)}><option value="">{required ? 'Selecione' : 'Não informado'}</option>{opcoes[c].filter(o => o.dados.estado === 'ativo' && (c !== 'categorias' || o.dados.natureza === 'despesa')).map(o => <option key={o.id} value={o.id}>{o.dados.nome}</option>)}</select>
  const setLinha = (numero: number, field: 'valor' | 'vencimento' | 'competencia', value: string) => setLinhas(v => ({ ...v, [numero]: { ...(v[numero] ?? { valor: '', vencimento: '', competencia: '' }), [field]: value } }))
  return <form ref={form} className="cadastro-form" aria-busy={busy} onChangeCapture={onInvalidate} onSubmit={submit}>
    <h2>Novo compromisso parcelado</h2>
    <p>Informe somente as parcelas que deseja cadastrar. O valor original pode permanecer desconhecido.</p>
    {error && <p role="alert">{error}</p>}
    <label>Tipo<select value={tipo} disabled={busy} onChange={e => setTipo(e.target.value)}><option value="compromissoExterno">Compromisso externo</option><option value="emprestimo">Empréstimo</option></select></label>
    <label>Descrição<input name="descricao" required maxLength={120} disabled={busy} value={descricao} onChange={e => setDescricao(e.target.value)} /></label>
    <label>Cadastro da série<select value={origem} disabled={busy} onChange={e => { setOrigem(e.target.value); if (e.target.value === 'nova') setP('1') }}><option value="nova">Série completa</option><option value="migrada">Série em andamento</option></select></label>
    <label>Quantidade original<input name="quantidadeOriginal" type="number" required min={1} max={12} disabled={busy} value={n} onChange={e => setN(e.target.value)} /></label>
    <label>Próxima parcela<input name="numeroInicial" type="number" required min={1} max={Number(n) || 12} disabled={busy || origem === 'nova'} value={p} onChange={e => setP(e.target.value)} /></label>
    <label>Modo do cronograma<select value={modo} disabled={busy} onChange={e => setModo(e.target.value)}><option value="mensal">Mensal</option><option value="explicito">Cronograma explícito</option></select></label>
    {modo === 'mensal' ? <fieldset disabled={busy}><legend>Parcelas mensais</legend>
      <label>Valor informado<select value={calculo} onChange={e => setCalculo(e.target.value)}><option value="porParcela">Valor por parcela</option><option value="total">Total das parcelas a cadastrar</option></select></label>
      <label>Valor em reais<input name="valor" required inputMode="decimal" placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)} /></label>
      <label>Próximo vencimento<input type="date" required min="1900-01-01" max="9999-12-31" value={vencimento} onChange={e => { setVencimento(e.target.value); setAncora(String(Number(e.target.value.slice(8, 10)) || 1)); if (!mes) setMes(e.target.value.slice(0, 7)) }} /></label>
      <label>Dia-base mensal<input type="number" required min={1} max={31} value={ancora} onChange={e => setAncora(e.target.value)} /></label>
      <label>Primeira competência do planejamento<input type="month" required min="1900-01" max="9999-12" value={mes} onChange={e => setMes(e.target.value)} /></label>
    </fieldset> : <fieldset disabled={busy}><legend>Valores e datas individuais</legend>{numeros.map(numero => <fieldset key={numero}><legend>Parcela {numero} de {n}</legend><label>Valor em reais<input required inputMode="decimal" value={linhas[numero]?.valor ?? ''} onChange={e => setLinha(numero, 'valor', e.target.value)} /></label><label>Vencimento<input type="date" required min="1900-01-01" max="9999-12-31" value={linhas[numero]?.vencimento ?? ''} onChange={e => setLinha(numero, 'vencimento', e.target.value)} /></label><label>Competência do planejamento<input type="month" required min="1900-01" max="9999-12" value={linhas[numero]?.competencia ?? ''} onChange={e => setLinha(numero, 'competencia', e.target.value)} /></label></fieldset>)}</fieldset>}
    <label>Categoria{select('categorias', categoria, setCategoria, true)}</label>
    <label>Titular (opcional){select('titulares', titular, setTitular)}</label>
    <label>Conta prevista (opcional){select('contas', conta, setConta)}</label>
    <fieldset disabled={busy}><legend>Etiquetas (até cinco)</legend>{opcoes.etiquetas.filter(o => o.dados.estado === 'ativo').map(o => <label className="check-label" key={o.id}><input type="checkbox" checked={etiquetas.includes(o.id)} disabled={!etiquetas.includes(o.id) && etiquetas.length >= 5} onChange={e => setEtiquetas(v => e.target.checked ? [...v, o.id] : v.filter(id => id !== o.id))} />{o.dados.nome}</label>)}</fieldset>
    <label>Valor original conhecido (opcional)<input inputMode="decimal" disabled={busy} value={original} onChange={e => setOriginal(e.target.value)} /></label>
    <label>Data de contratação conhecida (opcional)<input type="date" min="1900-01-01" max="9999-12-31" disabled={busy} value={contratacao} onChange={e => setContratacao(e.target.value)} /></label>
    <label>Data de consumo conhecida (opcional)<input type="date" min="1900-01-01" max="9999-12-31" disabled={busy} value={consumo} onChange={e => setConsumo(e.target.value)} /></label>
    <label>Observação (opcional)<textarea maxLength={1000} disabled={busy} value={observacao} onChange={e => setObservacao(e.target.value)} /></label>
    <button type="submit" disabled={busy}>Conferir cronograma</button><button type="button" disabled={busy} onClick={onCancel}>Cancelar</button>
  </form>
}
