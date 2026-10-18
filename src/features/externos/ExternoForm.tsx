import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Cadastro, Colecao, CursorCadastro, PortaCadastros } from '../../domain/finance/contracts/cadastros'
import type { DadosExterno, NaturezaExterna } from '../../domain/finance/contracts/externos'
import { interpretarBRL } from '../../domain/finance/money'
import { normalizarComandoExterno } from '../../domain/finance/externos'
import { diaAtualExterno } from './format'
const names:Record<Colecao,string>={categorias:'categorias',titulares:'titulares',contas:'contas previstas',etiquetas:'etiquetas'}
export function ExternoForm({natureza,timezone,cadastros,busy,onSave,onCancel}:{natureza:NaturezaExterna;timezone:string;cadastros:PortaCadastros;busy:boolean;onSave:(dados:DadosExterno)=>Promise<void>;onCancel:()=>void}) {
 const [today]=useState(()=>diaAtualExterno(timezone))
 const [descricao,setDescricao]=useState(''),[valor,setValor]=useState(''),[category,setCategory]=useState(''),[holder,setHolder]=useState(''),[account,setAccount]=useState(''),[observation,setObservation]=useState('')
 const [month,setMonth]=useState(today.slice(0,7)),[date,setDate]=useState(today),[occurrence,setOccurrence]=useState(today),[estimated,setEstimated]=useState(false),[labels,setLabels]=useState<string[]>([])
 const [options,setOptions]=useState<Record<Colecao,readonly Cadastro[]>>({categorias:[],titulares:[],contas:[],etiquetas:[]})
 const [cursors,setCursors]=useState<Partial<Record<Colecao,CursorCadastro>>>({}),[loading,setLoading]=useState<Partial<Record<Colecao,boolean>>>({categorias:true,titulares:true,contas:true,etiquetas:true}),[error,setError]=useState('')
 const form=useRef<HTMLFormElement>(null),alive=useRef(false)
 async function load(c:Colecao,cursor?:CursorCadastro) {
  setLoading(v=>({...v,[c]:true}))
  const r=await cadastros.listar(c,'ativo',50,cursor)
  if(!alive.current)return
  setLoading(v=>({...v,[c]:false}))
  if(!r.ok){setError(r.erro.mensagem);return}
  setOptions(v=>({...v,[c]:cursor?[...v[c],...r.valor.itens]:r.valor.itens}));setCursors(v=>({...v,[c]:r.valor.cursor}))
 }
 useEffect(()=>{alive.current=true;let active=true;for(const c of ['categorias','titulares','contas','etiquetas'] as const)void cadastros.listar(c,'ativo',50).then(r=>{if(!active)return;setLoading(v=>({...v,[c]:false}));if(r.ok){setOptions(v=>({...v,[c]:r.valor.itens}));setCursors(v=>({...v,[c]:r.valor.cursor}))}else setError(r.erro.mensagem)});form.current?.querySelector<HTMLInputElement>('[name="descricao"]')?.focus();return()=>{active=false;alive.current=false}},[cadastros])
 async function submit(e:FormEvent) {
  e.preventDefault();if(busy)return
  const money=interpretarBRL(valor)
  if(!money.ok||money.valor===0){setError('Informe um valor positivo no formato 1.234,56.');form.current?.querySelector<HTMLInputElement>('[name="valor"]')?.focus();return}
  const d={natureza,descricao,categoriaId:category,valorCentavos:money.valor,estimado:estimated,competenciaPlanejamento:month,...(natureza==='receita'?{dataPrevista:date}:{vencimento:date,dataConsumo:occurrence}),...(holder?{titularId:holder}:{}),...(account?{contaPrevistaId:account}:{}),...(observation?{observacao:observation}:{}),...(labels.length?{etiquetaIds:labels}:{})}
  const normalized=normalizarComandoExterno({contractVersion:1,tipo:natureza==='receita'?'criarReceita':'criarDespesa',operationKey:'validacao',origemId:'validacao',expectedVersion:0,dados:d},today)
  if(!normalized.ok||!('dados'in normalized.valor)){setError(normalized.ok?'Dados inválidos.':normalized.erro.mensagem);form.current?.querySelector<HTMLElement>('[name="descricao"]')?.focus();return}
  setError('');await onSave(normalized.valor.dados)
 }
 const select=(c:Colecao,value:string,onChange:(value:string)=>void,required=false)=><><select required={required} value={value} disabled={busy||loading[c]} onChange={e=>onChange(e.target.value)}><option value="">{required?'Selecione':'Não informado'}</option>{options[c].filter(o=>c!=='categorias'||o.dados.natureza===natureza).map(o=><option key={o.id} value={o.id}>{o.dados.nome}</option>)}</select></>
 return <form ref={form} className="cadastro-form" onSubmit={e=>{void submit(e)}} aria-busy={busy}>
  <h2>{natureza==='receita'?'Nova receita prevista':'Nova despesa pendente'}</h2>
  <p>Os campos de competência, previsão e ocorrência são independentes. Esta criação ainda não movimenta caixa.</p>
  {error&&<p role="alert">{error}</p>}
  <label>Descrição<input name="descricao" required maxLength={120} value={descricao} disabled={busy} onChange={e=>setDescricao(e.target.value)}/></label>
  <label>Categoria{select('categorias',category,setCategory,true)}</label>
  <label>Valor em reais<input name="valor" required inputMode="decimal" placeholder="0,00" value={valor} disabled={busy} onChange={e=>setValor(e.target.value)}/></label>
  <label className="check-label"><input type="checkbox" checked={estimated} disabled={busy} onChange={e=>setEstimated(e.target.checked)}/>Valor estimado</label>
  <label>Competência do planejamento<input type="month" required min="1900-01" max="9999-12" value={month} disabled={busy} onChange={e=>setMonth(e.target.value)}/></label>
  <label>{natureza==='receita'?'Data prevista de recebimento':'Vencimento'}<input type="date" required min="1900-01-01" max="9999-12-31" value={date} disabled={busy} onChange={e=>setDate(e.target.value)}/></label>
  {natureza==='despesa'&&<label>Data de ocorrência do gasto<input type="date" required min="1900-01-01" max="9999-12-31" value={occurrence} disabled={busy} onChange={e=>setOccurrence(e.target.value)}/></label>}
  <label>Titular opcional{select('titulares',holder,setHolder)}</label>
  <label>Conta prevista opcional{select('contas',account,setAccount)}</label>
  <label>Observação opcional<textarea maxLength={1000} value={observation} disabled={busy} onChange={e=>setObservation(e.target.value)}/></label>
  <fieldset><legend>Etiquetas opcionais — até cinco</legend>{options.etiquetas.map(o=><label className="check-label" key={o.id}><input type="checkbox" checked={labels.includes(o.id)} disabled={busy||!labels.includes(o.id)&&labels.length===5} onChange={e=>setLabels(v=>e.target.checked?[...v,o.id]:v.filter(id=>id!==o.id))}/>{o.dados.nome}</label>)}{options.etiquetas.length===0&&<p>Nenhuma etiqueta carregada.</p>}</fieldset>
  <div className="cadastro-actions">{(Object.keys(names) as Colecao[]).map(c=><button type="button" key={c} disabled={busy||loading[c]} onClick={()=>{void load(c,cursors[c])}}>{loading[c]?'Carregando':cursors[c]?'Mais':'Recarregar'} {names[c]}</button>)}</div>
  <div className="cadastro-actions"><button disabled={busy||!!loading.categorias}>{busy?'Confirmando…':'Criar previsão'}</button><button type="button" disabled={busy} onClick={onCancel}>Cancelar</button></div>
 </form>
}
