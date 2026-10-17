import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Cadastro, Colecao, DadosCadastro, PortaCadastros } from '../../domain/finance/contracts/cadastros'
import { validarDadosCadastro } from '../../domain/finance/cadastros'
import { interpretarBRL } from '../../domain/finance/money'
import { hojeNoFuso } from '../../domain/finance/calendar'
export function CadastroForm({colecao,atual,repo,busy,onSave,onCancel}:{colecao:Colecao;atual?:Cadastro;repo:PortaCadastros;busy:boolean;onSave:(dados:DadosCadastro)=>Promise<void>;onCancel:()=>void}) {
 const initial=atual?.dados
 const [nome,setNome]=useState(initial?.nome??'')
 const [natureza,setNatureza]=useState<'receita'|'despesa'>(initial?.natureza??'despesa')
 const [tipo,setTipo]=useState<'banco'|'carteira'|'contaPagamento'>(initial?.tipo??'contaPagamento')
 const [titularId,setTitular]=useState(initial?.titularId??'')
 const [base,setBase]=useState(initial?.saldoInicialCentavos!==undefined)
 const [valor,setValor]=useState(initial?.saldoInicialCentavos!==undefined?`${Math.floor(initial.saldoInicialCentavos/100)},${String(initial.saldoInicialCentavos%100).padStart(2,'0')}`:'')
 const [posicao,setPosicao]=useState<'credora'|'devedora'>(initial?.saldoInicialPosicao??'credora')
 const [data,setData]=useState(initial?.saldoInicialDataBase??'')
 const [titulares,setTitulares]=useState<readonly Cadastro[]>([])
 const [holderAtual,setHolderAtual]=useState<Cadastro>()
 const [cursor,setCursor]=useState<Awaited<ReturnType<PortaCadastros['listar']>>>()
 const [holderLoading,setHolderLoading]=useState(colecao==='contas')
 const [holderError,setHolderError]=useState('')
 const [locked,setLocked]=useState<boolean|undefined>(atual&&(colecao==='categorias'||colecao==='contas')?undefined:false)
 const [error,setError]=useState<{campo?:string;mensagem:string}>()
 const form=useRef<HTMLFormElement>(null)
 useEffect(()=>{let alive=true
  if(atual&&(colecao==='categorias'||colecao==='contas')) void repo.bloqueado(colecao,atual.id).then(r=>{if(alive){if(r.ok)setLocked(r.valor);else setError(r.erro)}})
  if(colecao==='contas') {
   void repo.listar('titulares','ativo').then(r=>{if(alive){setHolderLoading(false);if(r.ok){setTitulares(r.valor.itens);setCursor(r)}else setHolderError(r.erro.mensagem)}})
   if(initial?.titularId) void repo.obter('titulares',initial.titularId).then(r=>{if(alive){if(r.ok)setHolderAtual(r.valor);else setHolderError(r.erro.mensagem)}})
  }
  return()=>{alive=false}
 },[repo,atual,colecao,initial?.titularId])
 async function moreHolders(){if(holderLoading)return;setHolderLoading(true);const r=await repo.listar('titulares','ativo',50,cursor?.ok?cursor.valor.cursor:undefined);setHolderLoading(false);if(r.ok){setTitulares(old=>[...old,...r.valor.itens]);setCursor(r);setHolderError('')}else setHolderError(r.erro.mensagem)}
 async function submit(e:FormEvent){e.preventDefault();if(busy)return
  let dados:DadosCadastro={nome,estado:'ativo',...(colecao==='categorias'?{natureza}:{}),...(colecao==='contas'?{tipo,...(titularId?{titularId}:{})}: {})}
  if(colecao==='contas'&&base){const parsed=interpretarBRL(valor);if(!parsed.ok){setError({...parsed.erro,campo:'saldoInicialCentavos'});form.current?.querySelector<HTMLInputElement>('[name="saldoInicialCentavos"]')?.focus();return}dados={...dados,saldoInicialCentavos:parsed.valor,saldoInicialPosicao:posicao,saldoInicialDataBase:data}}
  const day=hojeNoFuso(Date.now(),'America/Rio_Branco');const valid=validarDadosCadastro(colecao,dados,day.ok?day.valor:'')
  if(!valid.ok){setError(valid.erro);form.current?.querySelector<HTMLElement>(`[name="${valid.erro.campo??'nome'}"]`)?.focus();return}
  setError(undefined);await onSave(valid.valor)
 }
 const disabled=busy||locked===undefined||atual?.dados.estado==='arquivado'
 return <form ref={form} className="cadastro-form" onSubmit={e=>{void submit(e)}} noValidate aria-busy={busy}>
  <h2>{atual?'Editar cadastro':'Novo cadastro'}</h2>
  {error&&<p role="alert" id="cadastro-form-error">{error.mensagem}</p>}
  <label>Nome<input name="nome" value={nome} onChange={e=>setNome(e.target.value)} disabled={busy} aria-invalid={error?.campo==='nome'} aria-describedby={error?'cadastro-form-error':undefined} autoComplete="off" /></label>
  {colecao==='titulares'&&<p className="scope-note">Titular é uma pessoa administrada. Este cadastro não cria login ou acesso.</p>}
  {colecao==='etiquetas'&&<p className="scope-note">Agrupe lançamentos por projeto ou finalidade usando um nome escolhido por você.</p>}
  {colecao==='categorias'&&<label>Natureza<select name="natureza" value={natureza} onChange={e=>setNatureza(e.target.value as typeof natureza)} disabled={disabled||locked}><option value="receita">Receita</option><option value="despesa">Despesa</option></select></label>}
  {colecao==='contas'&&<>
   <label>Tipo<select name="tipo" value={tipo} onChange={e=>setTipo(e.target.value as typeof tipo)} disabled={disabled||locked}><option value="banco">Banco</option><option value="carteira">Carteira / dinheiro</option><option value="contaPagamento">Conta de pagamento</option></select></label>
   <label>Titular (opcional)<select name="titularId" value={titularId} onChange={e=>setTitular(e.target.value)} disabled={busy||holderLoading}><option value="">Sem titular</option>{holderAtual&&!titulares.some(t=>t.id===holderAtual.id)&&<option value={holderAtual.id} disabled>{holderAtual.dados.nome}{holderAtual.dados.estado==='arquivado'?' (arquivado — vínculo atual)':''}</option>}{titulares.map(t=><option key={t.id} value={t.id}>{t.dados.nome} · {t.id.slice(-6)}</option>)}</select></label>
   {holderLoading&&<output aria-live="polite">Carregando titulares…</output>}{holderError&&<p role="alert">{holderError} <button type="button" onClick={()=>{void moreHolders()}}>Tentar novamente</button></p>}
   {cursor?.ok&&!cursor.valor.fim&&<button type="button" disabled={holderLoading} onClick={()=>{void moreHolders()}}>Carregar mais titulares</button>}
   <label className="check-label"><input type="checkbox" checked={base} onChange={e=>setBase(e.target.checked)} disabled={disabled||locked}/> Informar saldo inicial</label>
   {base&&<fieldset disabled={disabled||locked}><legend>Base inicial manual</legend><label>Valor (R$)<input name="saldoInicialCentavos" inputMode="decimal" value={valor} onChange={e=>setValor(e.target.value)} aria-invalid={error?.campo==='saldoInicialCentavos'}/></label><label>Posição<select name="saldoInicialPosicao" value={posicao} onChange={e=>setPosicao(e.target.value as typeof posicao)}><option value="credora">Credora</option><option value="devedora">Devedora</option></select></label><label>Data-base<input name="saldoInicialDataBase" type="date" value={data} onChange={e=>setData(e.target.value)} aria-invalid={error?.campo==='saldoInicialDataBase'}/></label><p>Posição no início desta data. Não cria receita ou despesa e não confirma saldo bancário.</p></fieldset>}
  </>}
  {locked===undefined&&<output aria-live="polite">Verificando primeiro uso…</output>}{locked&&<p>Natureza ou tipo/base estão bloqueados após primeiro uso. Você pode editar o nome.</p>}
  <div className="cadastro-actions"><button type="submit" disabled={disabled}>{busy?'Salvando…':'Salvar'}</button><button type="button" onClick={onCancel} disabled={busy}>Cancelar</button></div>
 </form>
}
