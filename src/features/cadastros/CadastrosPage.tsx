import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useSession } from '../../app/session/useSession'
import { firebase } from '../../infrastructure/firebase/client'
import { createCadastrosRepository } from '../../infrastructure/firebase/cadastrosRepository'
import { colecoes } from '../../domain/finance/contracts/cadastros'
import type { Cadastro, Colecao, ComandoCadastro, CursorCadastro, DadosCadastro, DescritorCadastro, FiltroCadastro } from '../../domain/finance/contracts/cadastros'
import { colecaoValida, descrever } from '../../domain/finance/cadastros'
import { hojeNoFuso } from '../../domain/finance/calendar'
import { formatarBRL } from '../../domain/finance/money'
import { CadastroForm } from './CadastroForm'
import { CadastroRequestScope, chavePendente, lerPendente } from './cadastroState'
const nomesCadastros:Record<Colecao,string>={titulares:'Titulares',categorias:'Categorias',contas:'Contas de pagamento',etiquetas:'Etiquetas / projetos'}
export function CadastrosPage(){const {colecao}=useParams();const session=useSession()
 if(!colecao)return <section><h1>Cadastros</h1><p className="intro">Organize seus cadastros privados.</p><nav className="cadastro-actions" aria-label="Cadastros">{colecoes.map(c=><Link key={c} to={`/app/cadastros/${c}`}>{nomesCadastros[c]}</Link>)}</nav></section>
 if(!colecaoValida(colecao))return <section><h1>Cadastro não encontrado</h1><Link to="/app/cadastros">Voltar aos cadastros</Link></section>
 if(!session.user)return null
 return <ListaCadastros key={`${session.user.uid}:${colecao}`} uid={session.user.uid} colecao={colecao}/>
}
function pendingFromStorage(uid:string){try{return lerPendente(sessionStorage.getItem(chavePendente),uid)?.descritor}catch{return undefined}}
function diaAtual(){const r=hojeNoFuso(Date.now(),'America/Rio_Branco');return r.ok?r.valor:''}
function ListaCadastros({uid,colecao}:{uid:string;colecao:Colecao}){
 const listGeneration=useRef(0)
 const alive=useRef(true),scope=useMemo(()=>new CadastroRequestScope(uid),[uid]),original=useRef<ComandoCadastro|undefined>(undefined)
 const repo=useMemo(()=>createCadastrosRepository(firebase().db,{uid,atual:()=>firebase().auth.currentUser?.uid===uid,hoje:diaAtual}),[uid])
 const [itens,setItens]=useState<readonly Cadastro[]>([]),[filter,setFilter]=useState<FiltroCadastro>('ativo'),[cursor,setCursor]=useState<CursorCadastro>(),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
 const [editor,setEditor]=useState<Cadastro|'novo'>(),[archive,setArchive]=useState<Cadastro>()
 const [pending,setPending]=useState(()=>pendingFromStorage(uid))
 const [reentry,setReentry]=useState<DescritorCadastro>()
 const [revision,setRevision]=useState(0)
 const formHeading=useRef<HTMLDivElement>(null)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;scope.clear()}},[scope])
 useEffect(()=>{let active=true;listGeneration.current++;void repo.listar(colecao,filter).then(r=>{if(!active||!alive.current)return;setLoading(false);if(r.ok){setItens(r.valor.itens);setCursor(r.valor.cursor)}else{setError(r.erro.mensagem);setItens([])}});return()=>{active=false}},[repo,colecao,filter,revision])
 useEffect(()=>{if(editor||archive)formHeading.current?.focus()},[editor,archive])
 function remember(d:DescritorCadastro|undefined){try{if(d)sessionStorage.setItem(chavePendente,JSON.stringify({uid,descritor:d}));else sessionStorage.removeItem(chavePendente)}catch{if(d){setError('Armazenamento da sessão indisponível. Nenhum envio foi iniciado.');return false}}setPending(d);return true}
 function refreshed(){listGeneration.current++;setItens([]);setLoading(true);setRevision(v=>v+1);setEditor(undefined);setArchive(undefined);setReentry(undefined)}
 async function send(command:ComandoCadastro){const ticket=scope.begin();if(ticket===undefined)return;if(!remember(descrever(command))){scope.finish(ticket);return}setBusy(true);setError('');setMessage('');original.current=command
  const result=await repo.executar(command)
  if(!alive.current||!scope.valid(ticket,uid))return
  scope.finish(ticket);setBusy(false)
  if(result.ok){remember(undefined);original.current=undefined;setMessage(result.valor.estado==='confirmado'?'Operação confirmada.':'Nenhuma alteração necessária.');refreshed()}
  else{setError(result.erro.mensagem);if(result.erro.codigo!=='confirmacaoIndeterminada'){remember(undefined);original.current=undefined;if(result.erro.codigo==='conflitoVersao')refreshed()}}
 }
 async function save(dados:DadosCadastro){
  const current=editor&&editor!=='novo'?editor:undefined
  const command={contractVersion:1 as const,operationKey:crypto.randomUUID(),cadastroId:reentry?.cadastroId??current?.id??crypto.randomUUID(),colecao,expectedVersion:reentry?.expectedVersion??current?.version??0,tipo:reentry?.tipo??(current?'editar':'criar'),dados} as ComandoCadastro
  await send(command)
 }
 async function more(){if(loading||!cursor)return;const generation=listGeneration.current;setLoading(true);setError('');const result=await repo.listar(colecao,filter,50,cursor);if(!alive.current||generation!==listGeneration.current)return;setLoading(false);if(result.ok){setItens(old=>[...old,...result.valor.itens]);setCursor(result.valor.cursor)}else setError(result.erro.mensagem)}
 async function verify(){if(!pending||busy)return;setBusy(true);const r=await repo.consultarOperacao(original.current?{modo:'comandoCompleto',comando:original.current}:{modo:'descritor',descritor:pending});if(!alive.current)return;setBusy(false)
  if(!r.ok){setError(r.erro.mensagem);return}
  if(r.valor.estado==='confirmado'){setMessage(`Operação confirmada na versão ${r.valor.version}: ${r.valor.dados.nome} (${r.valor.dados.estado}).${r.valor.verificacao==='descritor'?' Dados recuperados do recibo para conferência; o formulário anterior não foi retido.':''}`);remember(undefined);original.current=undefined;refreshed()}
  else setError(r.valor.estado==='indeterminado'?'Confirmação indisponível. Verifique sua conexão e consulte novamente.':'Não há recibo confirmado nesta leitura. Uma tentativa em trânsito ainda pode concluir. Consulte novamente ou reconfirme o conteúdo mantendo o mesmo cadastro.')
 }
 async function reopen(){if(!pending||pending.colecao!==colecao||busy)return
  setBusy(true);const checked=await repo.consultarOperacao({modo:'descritor',descritor:pending});if(!alive.current)return;setBusy(false)
  if(!checked.ok||checked.valor.estado!=='ausenteConfirmado'){await verify();return}
  const d=pending
  if(d.tipo==='criar'){setReentry(d);setPending(undefined);original.current=undefined;setEditor('novo');setMessage('Reinforme e confirme o conteúdo. O mesmo identificador será preservado.');return}
  setBusy(true);const r=await repo.obter(colecao,d.cadastroId);if(!alive.current)return;setBusy(false)
  if(!r.ok){setError(r.erro.mensagem);return}
  if(r.valor.version!==d.expectedVersion){setError('O cadastro mudou. Consulte a confirmação anterior antes de iniciar outra intenção.');return}
  setReentry(d);setPending(undefined);original.current=undefined
  if(d.tipo==='arquivar')setArchive(r.valor);else setEditor(r.valor)
 }
 const disabled=busy||!!pending
 function amount(c:Cadastro){if(c.dados.saldoInicialCentavos===undefined)return 'Base não informada';const f=formatarBRL(c.dados.saldoInicialCentavos);return `Saldo inicial informado: ${c.dados.saldoInicialPosicao==='devedora'?'devedor ':''}${f.ok?f.valor:''}, em ${c.dados.saldoInicialDataBase}`}
 return <section aria-busy={loading||busy}>
  <Link to="/app/cadastros">Todos os cadastros</Link><h1>{nomesCadastros[colecao]}</h1>
  <p className="scope-note">Cadastros privados da sua conta. Arquivados permanecem legíveis no histórico.</p>
  <div className="cadastro-actions"><label>Mostrar<select value={filter} disabled={busy||!!reentry} onChange={e=>{listGeneration.current++;setItens([]);setLoading(true);setError('');setFilter(e.target.value as FiltroCadastro)}}><option value="ativo">Ativos</option><option value="arquivado">Arquivados</option><option value="todos">Todos</option></select></label><button onClick={()=>{setEditor('novo');setArchive(undefined);setError('')}} disabled={disabled||!!reentry}>Novo cadastro</button><button onClick={()=>{listGeneration.current++;setLoading(true);setError('');setRevision(x=>x+1)}} disabled={loading||busy}>Recarregar</button></div>
  {error&&<p role="alert">{error}</p>}{message&&<output aria-live="polite">{message}</output>}
  {pending&&<aside className="setup-notice"><h2>Operação aguardando confirmação</h2><p>O envio anterior pode ter sido confirmado. Confira antes de criar outra intenção.</p><div className="cadastro-actions"><button disabled={busy} onClick={()=>{void verify()}}>Verificar confirmação</button>{pending.colecao===colecao?<button disabled={busy} onClick={()=>{void reopen()}}>Reinformar após conferir ausência</button>:<Link to={`/app/cadastros/${pending.colecao}`}>Abrir cadastro da operação</Link>}<button disabled={busy} onClick={()=>{if(original.current)void send(original.current);else setError('O formulário anterior não foi retido. Confira o recibo ou reinforme o conteúdo.')}}>Repetir a mesma intenção</button></div></aside>}
  {editor&&!pending&&<div ref={formHeading} tabIndex={-1}><CadastroForm key={editor==='novo'?'novo':`${editor.id}:${editor.version}`} colecao={colecao} atual={editor==='novo'?undefined:editor} repo={repo} busy={busy} onSave={save} onCancel={()=>{if(reentry){remember(reentry);setReentry(undefined)}setEditor(undefined)}}/></div>}
  {archive&&!pending&&<div className="setup-notice" ref={formHeading} tabIndex={-1} ><fieldset><legend>Confirmar arquivamento</legend><h2>Arquivar {archive.dados.nome}?</h2><p>O histórico e as pendências serão preservados. O cadastro não poderá receber novos vínculos e não poderá ser reativado nesta versão.{colecao==='contas'?' Novos pagamentos e recebimentos exigirão uma conta ativa.':''}</p><div className="cadastro-actions"><button disabled={busy} onClick={()=>{void send({contractVersion:1,operationKey:crypto.randomUUID(),cadastroId:archive.id,colecao,expectedVersion:reentry?.expectedVersion??archive.version,tipo:'arquivar',dados:{...archive.dados,estado:'arquivado'}} as ComandoCadastro)}}>Confirmar arquivamento</button><button disabled={busy} onClick={()=>{if(reentry){remember(reentry);setReentry(undefined)}setArchive(undefined)}}>Cancelar</button></div></fieldset></div>}
  {loading&&<output aria-live="polite">Carregando cadastros…</output>}
  {!loading&&!error&&itens.length===0&&<p>Nenhum cadastro neste filtro.</p>}
  <ul className="cadastro-list">{itens.map(item=><li key={item.id}><div><strong>{item.dados.nome}</strong><span> · {item.dados.estado} · {item.id.slice(-6)}</span>{item.dados.natureza&&<p>{item.dados.natureza}</p>}{colecao==='contas'&&<><p>{item.dados.tipo} · {amount(item)}</p><p>Saldo bancário não confirmado.</p></>}</div><div className="cadastro-actions">{item.dados.estado==='ativo'&&<><button disabled={disabled||!!reentry} onClick={()=>{setEditor(item);setArchive(undefined);setError('')}}>Editar {item.dados.nome}</button><button disabled={disabled||!!reentry} onClick={()=>{setArchive(item);setEditor(undefined);setError('')}}>Arquivar {item.dados.nome}</button></>}</div></li>)}</ul>
  {cursor&&<button disabled={loading||busy} onClick={()=>{void more()}}>Próxima página</button>}
 </section>
}
