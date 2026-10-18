import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useSession } from '../../app/session/useSession'
import { firebase } from '../../infrastructure/firebase/client'
import { createCadastrosRepository } from '../../infrastructure/firebase/cadastrosRepository'
import { somarCentavos } from '../../domain/finance/money'
import type { ComandoExterno, ConsultaExterna, DescritorExterno, LinhaExterna, NaturezaExterna, PaginaExterna } from '../../domain/finance/contracts/externos'
import { ExternoForm } from './ExternoForm'
import { chaveExterna, IntencaoExterna, lerDescritorExterno } from './externoState'
import { useExternoRepository } from './useExternoRepository'
import { brl, diaAtualExterno } from './format'
export function ExternosPage() {
 const session=useSession()
 return session.user&&session.generation&&session.timezone?<ListaExternos key={`${session.user.uid}:${session.generation}`} uid={session.user.uid} generation={session.generation} timezone={session.timezone}/>:null
}
function readPending(uid:string){try{return lerDescritorExterno(sessionStorage.getItem(chaveExterna),uid)}catch{return undefined}}
function ListaExternos({uid,generation,timezone}:{uid:string;generation:number;timezone:string}) {
 const repo=useExternoRepository(uid,generation,timezone)
 const cadastros=useMemo(()=>createCadastrosRepository(firebase().db,{uid,atual:()=>firebase().auth.currentUser?.uid===uid,hoje:()=>diaAtualExterno(timezone)}),[uid,timezone])
 const intent=useMemo(()=>new IntencaoExterna(uid),[uid]),alive=useRef(false),listGeneration=useRef(0)
 const [month,setMonth]=useState(()=>diaAtualExterno(timezone).slice(0,7)),[nature,setNature]=useState<'ambas'|NaturezaExterna>('ambas'),[revision,setRevision]=useState(0)
 const [page,setPage]=useState<PaginaExterna>(),[items,setItems]=useState<readonly LinhaExterna[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
 const [editor,setEditor]=useState<NaturezaExterna>(),[pending,setPending]=useState(()=>readPending(uid)),[reentry,setReentry]=useState<DescritorExterno>()
 const query=useMemo<ConsultaExterna>(()=>({base:'planejamento',competencia:month,filtro:{natureza:nature},pageSize:50}),[month,nature])
 const alertRef=useRef<HTMLParagraphElement>(null)
 function refresh(){listGeneration.current++;setItems([]);setPage(undefined);setLoading(true);setError('');setRevision(x=>x+1)}
 useEffect(()=>{alive.current=true;const focus=()=>refresh();const dispose=()=>{listGeneration.current++;intent.encerrar()};window.addEventListener('focus',focus);return()=>{alive.current=false;dispose();window.removeEventListener('focus',focus)}},[intent])
 useEffect(()=>{let active=true;const ticket=++listGeneration.current;void repo.listar(query).then(r=>{if(!active||!alive.current||ticket!==listGeneration.current)return;setLoading(false);if(r.ok){setItems(r.valor.itens);setPage(r.valor)}else setError(r.erro.mensagem)});return()=>{active=false}},[repo,query,revision])
 const expiresAt=page?.snapshot.expiresAt
 useEffect(()=>{if(expiresAt===undefined)return;const timer=setTimeout(refresh,Math.max(0,expiresAt-Date.now()));return()=>clearTimeout(timer)},[expiresAt])
 useEffect(()=>{if(error)alertRef.current?.focus()},[error])
 function remember(d:DescritorExterno|undefined){try{if(d)sessionStorage.setItem(chaveExterna,JSON.stringify(d));else sessionStorage.removeItem(chaveExterna)}catch{setError('Armazenamento da sessão indisponível. Consulte a intenção antes de novo envio.');return false}setPending(d);return true}
 async function send(command:ComandoExterno) {
  const d=intent.iniciar(command);if(!d)return
  if(!remember(d)){intent.encerrar();return}
  setBusy(true);setError('');setMessage('')
  const result=await repo.executar(command)
  if(!alive.current)return
  intent.finalizarEnvio();setBusy(false)
  if(result.ok){remember(undefined);intent.encerrar();setEditor(undefined);setReentry(undefined);refresh();setMessage('Previsão confirmada. Nenhuma movimentação de caixa foi criada.')}
  else setError(result.erro.mensagem)
 }
 async function save(dados:import('../../domain/finance/contracts/externos').DadosExterno) {
  const c={contractVersion:1,tipo:dados.natureza==='receita'?'criarReceita':'criarDespesa',operationKey:reentry?.operationKey??crypto.randomUUID(),origemId:reentry?.origemId??crypto.randomUUID(),expectedVersion:0,dados} as ComandoExterno
  await send(c)
 }
 async function verify(reopen=false) {
  if(!pending||busy)return
  setBusy(true);const command=intent.comando()
  const r=await repo.consultarOperacao(command?{modo:'comandoCompleto',comando:command}:{modo:'descritor',descritor:pending})
  if(!alive.current)return;setBusy(false)
  if(!r.ok){setError(r.erro.mensagem);return}
  if(r.valor.estado==='confirmado'){setMessage(`Confirmado: ${r.valor.evento.depois.descricao}, ${brl(r.valor.evento.depois.valorCentavos)}. ${r.valor.verificacao==='descritor'?'Conteúdo recuperado do recibo para sua conferência.':''}`);remember(undefined);intent.encerrar();setEditor(undefined);setReentry(undefined);refresh()}
  else if(reopen&&r.valor.estado==='ausenteConfirmado'&&(pending.tipo==='criarReceita'||pending.tipo==='criarDespesa')){setReentry(pending);intent.encerrar();setEditor(pending.tipo==='criarReceita'?'receita':'despesa');setPending(undefined);setError('');setMessage('Reinforme o conteúdo. Os identificadores da intenção anterior serão preservados.')}
  else setError(r.valor.estado==='indeterminado'?'Resultado indeterminado. Consulte novamente antes de criar outra intenção.':'Nenhum recibo nesta leitura. Uma tentativa em trânsito ainda pode concluir. Preserve a mesma intenção.')
 }
 async function more(){if(!page?.cursor||loading)return;const ticket=listGeneration.current;setLoading(true);const r=await repo.listar(query,page.cursor);if(!alive.current||ticket!==listGeneration.current)return;setLoading(false);if(r.ok){setItems(old=>[...old,...r.valor.itens]);setPage(r.valor)}else setError(r.erro.mensagem)}
 const total=(n:NaturezaExterna)=>{const r=somarCentavos(items.filter(i=>i.origem.natureza===n).map(i=>i.exigivelCentavos));return r.ok?brl(r.valor):'Total excede o limite seguro'}
 return <section aria-busy={loading||busy}>
  <h1>Receitas e despesas</h1><p>Planejamento por competência. Compromissos quitados permanecem no total do mês.</p>
  <div className="cadastro-actions"><label>Mês<input type="month" min="1900-01" max="9999-12" value={month} onChange={e=>{setMonth(e.target.value);refresh()}}/></label><label>Natureza<select value={nature} onChange={e=>{setNature(e.target.value as typeof nature);refresh()}}><option value="ambas">Receitas e despesas</option><option value="receita">Receitas</option><option value="despesa">Despesas</option></select></label><button onClick={refresh} disabled={loading}>Atualizar</button></div>
  <div className="cadastro-actions"><button disabled={busy||!!pending||!!reentry} onClick={()=>setEditor('receita')}>Nova receita</button><button disabled={busy||!!pending||!!reentry} onClick={()=>setEditor('despesa')}>Nova despesa</button><Link to="/app/cadastros">Gerenciar categorias e contas</Link></div>
  {error&&<p role="alert" ref={alertRef} tabIndex={-1}>{error}</p>}{message&&<output aria-live="polite">{message}</output>}
  {pending&&<aside className="setup-notice"><h2>Intenção aguardando conferência</h2><p>Verifique a confirmação antes de iniciar outro lançamento. Após recarregar, somente o identificador é recuperado.</p><div className="cadastro-actions"><button disabled={busy} onClick={()=>{void verify()}}>Verificar confirmação</button>{intent.comando()&&<button disabled={busy} onClick={()=>{const c=intent.comando();if(c)void send(c)}}>Repetir a mesma intenção</button>}<button disabled={busy} onClick={()=>{void verify(true)}}>Reinformar após conferir ausência</button></div></aside>}
  {editor&&!pending&&<ExternoForm key={`${editor}:${reentry?.operationKey??'nova'}`} natureza={editor} timezone={timezone} cadastros={cadastros} busy={busy} onSave={save} onCancel={()=>{if(reentry){remember(reentry);setReentry(undefined)}setEditor(undefined)}}/>}
  {loading&&<output aria-live="polite">Carregando planejamento…</output>}
  {page&&<><p>Consulta em {new Date(page.snapshot.readTime).toLocaleString('pt-BR',{timeZone:timezone})}.</p><p>{page.completo&&!error?'Totais do mês consultado':'Totais parciais do recorte carregado'}: receitas {total('receita')} · compromissos {total('despesa')}.</p>{!page.completo&&<p>Há páginas pendentes. Carregue todas antes de conferir o total mensal.</p>}</>}
  {!loading&&!error&&page?.completo&&items.length===0&&<p>Nenhum lançamento nesta competência.</p>}
  <ul className="cadastro-list">{items.map(item=><li key={item.origem.id}><Link to={`/app/lancamentos/${item.origem.id}`}>{item.origem.descricao}</Link><p>{item.origem.natureza} · {brl(item.origem.valorCentavos)}{item.origem.estimado?' (estimado)':''} · {item.situacao}</p><p>{item.origem.natureza==='receita'?'Previsão':'Vencimento'}: {item.origem.natureza==='receita'?item.origem.dataPrevista:item.origem.vencimento} · Pendente: {brl(item.pendenteCentavos)}</p></li>)}</ul>
  {page?.cursor&&<button disabled={loading} onClick={()=>{void more()}}>Carregar próxima página</button>}
 </section>
}
