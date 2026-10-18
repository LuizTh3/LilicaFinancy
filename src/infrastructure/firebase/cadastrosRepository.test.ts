import { beforeEach, expect, it, vi } from 'vitest'
import type { Firestore } from 'firebase/firestore'
import { FirebaseError } from 'firebase/app'
import { createCadastrosRepository } from './cadastrosRepository'
import type { ComandoCadastro } from '../../domain/finance/contracts/cadastros'
const memory=vi.hoisted(()=>({docs:new Map<string,Record<string,unknown>>(),race:undefined as (()=>void)|undefined,offline:false,listError:undefined as unknown,transactionError:undefined as unknown}))
vi.mock('firebase/firestore',async importOriginal=>{
 const actual=await importOriginal<typeof import('firebase/firestore')>()
 const snapshot=(path:string)=>{const data=memory.docs.get(path);return {exists:()=>!!data,data:()=>data?{...data}:undefined}}
 return {...actual,collection:(_db:unknown,...parts:string[])=>({path:parts.join('/')}),query:(...parts:unknown[])=>parts,getDocsFromServer:async()=>{if(memory.listError)throw memory.listError;return {docs:[]}},doc:(_db:unknown,...parts:string[])=>({path:parts.join('/')}),serverTimestamp:()=>actual.Timestamp.fromMillis(1000),getDocFromServer:async(ref:{path:string})=>{if(memory.offline)throw Error('offline');return snapshot(ref.path)},runTransaction:async(_db:unknown,callback:(tx:unknown)=>Promise<unknown>)=>{
  if(memory.transactionError)throw memory.transactionError
  let writes=new Map<string,Record<string,unknown>>(),writing=false
  const tx={get:async(ref:{path:string})=>{if(writing)throw Error('READ_AFTER_WRITE');return snapshot(ref.path)},set:(ref:{path:string},data:Record<string,unknown>)=>{writing=true;writes.set(ref.path,data)}}
  let result=await callback(tx)
  if(memory.race){memory.race();memory.race=undefined;writes=new Map();writing=false;result=await callback(tx)}
  for(const [k,v] of writes)memory.docs.set(k,v)
  return result
 }}
})
const command:ComandoCadastro={contractVersion:1,operationKey:'op-1',cadastroId:'id-1',colecao:'titulares',expectedVersion:0,tipo:'criar',dados:{nome:'Pessoa',estado:'ativo'}}
const ctx={uid:'A',atual:()=>true,hoje:()=> '2026-10-17'}
const db={} as Firestore
beforeEach(()=>{memory.docs.clear();memory.offline=false;memory.race=undefined;memory.listError=undefined;memory.transactionError=undefined})
it('índice ausente na listagem não é apresentado como falha de conexão nem expõe a URL interna',async()=>{
 memory.listError=new FirebaseError('failed-precondition','The query requires an index. https://console.firebase.google.com/private-project')
 const result=await createCadastrosRepository(db,ctx).listar('titulares','ativo')
 expect(result).toMatchObject({ok:false,erro:{codigo:'configuracaoPendente',recuperacao:'reler'}})
 if(!result.ok){expect(result.erro.mensagem).toContain('índice');expect(result.erro.mensagem).not.toMatch(/conexão|https:|private-project/)}
})
it('índice em construção e outras pré-condições não são confundidos com offline',async()=>{
 const r=createCadastrosRepository(db,ctx)
 memory.listError=new FirebaseError('failed-precondition','The query requires an index. That index is currently building and cannot be used yet.')
 const building=await r.listar('contas','ativo')
 expect(!building.ok&&building.erro.codigo).toBe('configuracaoPendente')
 memory.listError=new FirebaseError('failed-precondition','Database is not ready')
 const other=await r.listar('etiquetas','ativo')
 expect(!other.ok&&other.erro.mensagem).not.toMatch(/conexão|índice/)
})
it('sessão expirada e rede indisponível têm orientações distintas',async()=>{
 const r=createCadastrosRepository(db,ctx)
 memory.listError=new FirebaseError('unauthenticated','Expired token')
 expect(await r.listar('categorias','ativo')).toMatchObject({ok:false,erro:{codigo:'semPermissao',recuperacao:'verificarAcesso'}})
 memory.listError=new FirebaseError('unavailable','Offline')
 const offline=await r.listar('categorias','ativo')
 expect(!offline.ok&&offline.erro.mensagem).toContain('conexão')
})
it('pré-condição rejeitada na escrita não vira confirmação indeterminada',async()=>{
 memory.transactionError=new FirebaseError('failed-precondition','Database is not ready')
 const result=await createCadastrosRepository(db,ctx).executar(command)
 expect(result).toMatchObject({ok:false,erro:{codigo:'configuracaoPendente'}})
 expect(memory.docs.size).toBe(0)
})
it('o repositório concreto recupera resposta perdida e não duplica criação',async()=>{
 const r=createCadastrosRepository(db,ctx,async()=>{throw Error('lost response')})
 expect((await r.executar(command)).ok).toBe(true)
 expect((await r.executar(command)).ok).toBe(true)
 expect(memory.docs.size).toBe(2)
})
it('repetição consulta recibo original antes da versão atual',async()=>{
 const r=createCadastrosRepository(db,ctx)
 await r.executar(command)
 await r.executar({...command,operationKey:'op-2',tipo:'editar',expectedVersion:1,dados:{nome:'Novo',estado:'ativo'}})
 const replay=await r.executar(command)
 expect(replay.ok&&replay.valor.version).toBe(1)
 expect(memory.docs.get('users/A/titulares/id-1')?.nome).toBe('Novo')
 const changed=await r.executar({...command,dados:{nome:'Outro',estado:'ativo'}})
 expect(!changed.ok&&changed.erro.codigo).toBe('conflitoIdempotencia')
})
it('retry do SDK não muda expectedVersion nem sobrescreve disputa',async()=>{
 const r=createCadastrosRepository(db,ctx);await r.executar(command)
 memory.race=()=>{const d=memory.docs.get('users/A/titulares/id-1')!;memory.docs.set('users/A/titulares/id-1',{...d,version:2,nome:'Outra aba'})}
 const result=await r.executar({...command,operationKey:'op-2',tipo:'editar',expectedVersion:1,dados:{nome:'Meu formulário',estado:'ativo'}})
 expect(!result.ok&&result.erro.codigo).toBe('conflitoVersao')
 expect(memory.docs.get('users/A/titulares/id-1')?.nome).toBe('Outra aba')
})
it('descritor identifica resultado sem conteúdo perdido e nunca escreve',async()=>{
 const r=createCadastrosRepository(db,ctx);await r.executar(command)
 const {descrever}=await import('../../domain/finance/cadastros')
 const out=await r.consultarOperacao({modo:'descritor',descritor:descrever(command)})
 expect(out.ok&&out.valor.estado==='confirmado'&&out.valor.verificacao).toBe('descritor')
 expect(memory.docs.size).toBe(2)
 memory.offline=true
 expect(await r.consultarOperacao({modo:'descritor',descritor:descrever(command)})).toEqual({ok:true,valor:{estado:'indeterminado'}})
})
it('nova referência arquivada é recusada, histórica idêntica é preservada',async()=>{
 const r=createCadastrosRepository(db,ctx);await r.executar(command)
 await r.executar({...command,operationKey:'op-2',tipo:'arquivar',expectedVersion:1,dados:{nome:'Pessoa',estado:'arquivado'}})
 const conta:ComandoCadastro={...command,operationKey:'conta-op',cadastroId:'conta-1',colecao:'contas',dados:{nome:'Conta',estado:'ativo',tipo:'carteira',titularId:'id-1'}}
 const rejected=await r.executar(conta);expect(!rejected.ok&&rejected.erro.codigo).toBe('referenciaInvalida')
 expect(memory.docs.has('users/A/contas/conta-1')).toBe(false)
})
it('sessão invalidada não inicia escrita',async()=>{
 const r=createCadastrosRepository(db,{...ctx,atual:()=>false})
 expect((await r.executar(command)).ok).toBe(false);expect(memory.docs.size).toBe(0)
})
it('controle de primeiro uso impede alterar base, mas permite renomear',async()=>{
 const r=createCadastrosRepository(db,ctx)
 const c:ComandoCadastro={...command,colecao:'contas',dados:{nome:'Conta',estado:'ativo',tipo:'banco',saldoInicialCentavos:0,saldoInicialPosicao:'credora',saldoInicialDataBase:'2026-10-17'}}
 await r.executar(c)
 memory.docs.set('users/A/usoCadastros/contas__id-1',{malformado:true})
 const change=await r.executar({...c,operationKey:'op-2',tipo:'editar',expectedVersion:1,dados:{...c.dados,saldoInicialCentavos:100}})
 expect(!change.ok&&change.erro.codigo).toBe('valorInvalido')
 expect((await r.executar({...c,operationKey:'op-3',tipo:'editar',expectedVersion:1,dados:{...c.dados,nome:'Novo nome'}})).ok).toBe(true)
})
it('usoFinanceiro embutido congela base e sobrevive ao CRUD sem reescrita',async()=>{
 const r=createCadastrosRepository(db,ctx)
 const c:ComandoCadastro={...command,colecao:'contas',dados:{nome:'Conta',estado:'ativo',tipo:'banco'}}
 await r.executar(c)
 const {Timestamp}=await import('firebase/firestore')
 const use={eventoId:'pagar__use-1',origemId:'origin-1',papel:'movimentacao',createdAt:Timestamp.fromMillis(1000)}
 const stored=memory.docs.get('users/A/contas/id-1')!
 expect(stored.schemaVersion).toBe(2)
 memory.docs.set('users/A/contas/id-1',{...stored,usoFinanceiro:use})
 expect(await r.bloqueado('contas','id-1')).toEqual({ok:true,valor:true})
 const changed=await r.executar({...c,operationKey:'change',tipo:'editar',expectedVersion:1,dados:{nome:'Conta',estado:'ativo',tipo:'carteira'}})
 expect(changed).toMatchObject({ok:false,erro:{codigo:'valorInvalido'}})
 expect((await r.executar({...c,operationKey:'rename',tipo:'editar',expectedVersion:1,dados:{...c.dados,nome:'Renomeada'}})).ok).toBe(true)
 expect(memory.docs.get('users/A/contas/id-1')).toMatchObject({schemaVersion:2,usoFinanceiro:use,version:2})
 expect((await r.executar({...c,operationKey:'archive',tipo:'arquivar',expectedVersion:2,dados:{...c.dados,nome:'Renomeada',estado:'arquivado'}})).ok).toBe(true)
 expect(memory.docs.get('users/A/contas/id-1')).toMatchObject({estado:'arquivado',usoFinanceiro:use})
})
it('arquivamento mantém vínculo histórico e repetição nova não cria versão',async()=>{
 const r=createCadastrosRepository(db,ctx);await r.executar(command)
 const c:ComandoCadastro={...command,colecao:'contas',cadastroId:'conta',operationKey:'conta-op',dados:{nome:'Conta',estado:'ativo',tipo:'carteira',titularId:'id-1'}}
 await r.executar(c)
 const archived={...command,expectedVersion:1,tipo:'arquivar' as const,operationKey:'archive',dados:{...command.dados,estado:'arquivado' as const}}
 await r.executar(archived)
 expect((await r.executar({...c,expectedVersion:1,tipo:'editar',operationKey:'rename',dados:{...c.dados,nome:'Renomeada'}})).ok).toBe(true)
 const noop=await r.executar({...archived,expectedVersion:2,operationKey:'again'})
 expect(noop.ok&&noop.valor.estado).toBe('semAlteracao')
 expect(memory.docs.has('users/A/operacoesCadastros/titulares__id-1__3')).toBe(false)
})
