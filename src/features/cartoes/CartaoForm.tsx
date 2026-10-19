import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { validarDadosCartao } from '../../domain/finance/cartoes'
import type { Cartao, DadosCartao } from '../../domain/finance/contracts/cartoes'
import type { Cadastro } from '../../domain/finance/contracts/cadastros'
import type { ErroDominio } from '../../domain/finance/errors'
export function CartaoForm({cartao,titulares,nomeAtual,busy,maisTitulares,onMaisTitulares,onSalvar,onCancelar}:{cartao?:Cartao;titulares:readonly Cadastro[];nomeAtual?:string;busy:boolean;maisTitulares:boolean;onMaisTitulares:()=>void;onSalvar:(dados:DadosCartao)=>Promise<void>;onCancelar:()=>void}) {
 const [banco,setBanco]=useState(cartao?.banco??''),[nome,setNome]=useState(cartao?.nome??''),[titularId,setTitular]=useState(cartao?.titularId??''),[diaFechamento,setFechamento]=useState(String(cartao?.diaFechamento??10)),[diaVencimento,setVencimento]=useState(String(cartao?.diaVencimento??17)),[error,setError]=useState<ErroDominio>()
 const errorRef=useRef<HTMLParagraphElement>(null)
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(busy)return;const valid=validarDadosCartao({banco,nome,titularId,diaFechamento:Number(diaFechamento),diaVencimento:Number(diaVencimento)});if(!valid.ok){setError(valid.erro);requestAnimationFrame(()=>errorRef.current?.focus());return}setError(undefined);await onSalvar(valid.valor)}
 const fieldError=(campo:string)=>error?.campo===campo
 return <form className="cadastro-form" noValidate onSubmit={e=>{void submit(e)}} aria-busy={busy}>
  <h2>{cartao?'Editar cartão':'Novo cartão'}</h2>
  {error&&<p role="alert" id="cartao-error" ref={errorRef} tabIndex={-1}>{error.mensagem}</p>}
  <label>Banco<input name="banco" value={banco} onChange={e=>setBanco(e.target.value)} disabled={busy} aria-invalid={fieldError('banco')} aria-describedby={error?'cartao-error':undefined} autoComplete="off"/></label>
  <label>Nome do cartão<input name="nome" value={nome} onChange={e=>setNome(e.target.value)} disabled={busy} aria-invalid={fieldError('nome')} aria-describedby={error?'cartao-error':undefined} autoComplete="off"/></label>
  <label>Titular<select name="titularId" value={titularId} onChange={e=>setTitular(e.target.value)} disabled={busy} aria-invalid={fieldError('titularId')} aria-describedby={error?'cartao-error':undefined}>
   <option value="">Selecione um titular ativo</option>
   {cartao&&!titulares.some(t=>t.id===cartao.titularId)&&<option value={cartao.titularId}>{nomeAtual??'Titular atual'} — vínculo preservado</option>}
   {titulares.map(t=><option key={t.id} value={t.id}>{t.dados.nome}</option>)}
  </select></label>
  {maisTitulares&&<button type="button" disabled={busy} onClick={onMaisTitulares}>Carregar mais titulares</button>}
  {!titulares.length&&!cartao&&<p>Cadastre um titular ativo na área de cadastros antes de salvar o cartão.</p>}
  <label>Dia do fechamento<input name="diaFechamento" type="number" min="1" max="31" step="1" value={diaFechamento} onChange={e=>setFechamento(e.target.value)} disabled={busy} aria-invalid={fieldError('diaFechamento')} aria-describedby={error?'cartao-error':undefined}/></label>
  <label>Dia do vencimento<input name="diaVencimento" type="number" min="1" max="31" step="1" value={diaVencimento} onChange={e=>setVencimento(e.target.value)} disabled={busy} aria-invalid={fieldError('diaVencimento')} aria-describedby={error?'cartao-error':undefined}/></label>
  <p>Não informe número completo, CVV, senha ou acesso bancário. Titular é uma pessoa administrada; não recebe acesso à sua conta.</p>
  {cartao&&<p>Alterar os dias padrão não modifica datas ou limites de faturas já confirmadas. O novo padrão vale somente para períodos ainda não confirmados.</p>}
  <div className="actions"><button type="submit" disabled={busy}>Salvar cartão</button><button type="button" disabled={busy} onClick={onCancelar}>Cancelar</button></div>
 </form>
}
