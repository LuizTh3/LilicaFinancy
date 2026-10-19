import { beforeEach, expect, it, vi } from 'vitest'
import type { Firestore } from 'firebase/firestore'
import { calendarioBaseFatura } from '../../domain/finance/invoiceCalendar'
import { createFaturasQueries } from './faturasQueries'
const memory=vi.hoisted(()=>({docs:new Map<string,Record<string,unknown>>(),reads:[] as string[],constraints:[] as unknown[],results:[] as {id:string;data:()=>unknown}[],queryError:undefined as unknown}))
vi.mock('firebase/firestore',async original=>{
 const a=await original<typeof import('firebase/firestore')>()
 return {...a,doc:(_db:unknown,...p:string[])=>({path:p.join('/')}),collection:(_db:unknown,...p:string[])=>({path:p.join('/')}),where:(...x:unknown[])=>['where',...x],orderBy:(...x:unknown[])=>['orderBy',...x],startAfter:(...x:unknown[])=>['startAfter',...x],limit:(n:number)=>['limit',n],query:(...x:unknown[])=>{memory.constraints=x;return x},getDocFromServer:async(r:{path:string})=>{memory.reads.push(r.path);return {exists:()=>memory.docs.has(r.path),data:()=>memory.docs.get(r.path)}},getDocsFromServer:async()=>{if(memory.queryError)throw memory.queryError;return {docs:memory.results}}}
})
const db={} as Firestore,ctx={uid:'A',generation:1,atual:()=>true}
beforeEach(async()=>{memory.docs.clear();memory.reads=[];memory.constraints=[];memory.results=[];memory.queryError=undefined;const {Timestamp}=await import('firebase/firestore');memory.docs.set('users/A/cartoes/card',{banco:'Banco',nome:'Nome',titularId:'holder',diaFechamento:10,diaVencimento:17,estado:'ativo',schemaVersion:1,version:1,ultimoEventoId:'criarCartao__key',createdAt:Timestamp.fromMillis(1),updatedAt:Timestamp.fromMillis(1)})})
it('prévia usa contenção limitada2 e no máximo sete competências deduplicadas, sem escritas',async()=>{
 const out=await createFaturasQueries(db,ctx).prever('card','2026-10-10')
 expect(out).toMatchObject({ok:true,valor:{estado:'sugestao',calendario:{competencia:'2026-11'}}})
 expect(memory.constraints).toContainEqual(['limit',2])
 expect(memory.constraints).toContainEqual(['where','inicio','<=','2026-10-10'])
 expect(memory.constraints).toContainEqual(['where','fechamento','>','2026-10-10'])
 expect(memory.reads.filter(x=>x.includes('/faturas/')).length).toBe(7)
 expect(new Set(memory.reads).size).toBe(memory.reads.length)
})
it('deduplica snapshot encontrado pela consulta e ID; rejeita duas leituras divergentes',async()=>{
 const {Timestamp}=await import('firebase/firestore'),b=calendarioBaseFatura('2026-11',10,17);if(!b.ok)throw Error('fixture')
 const v={...b.valor,cartaoId:'card',schemaVersion:1,versaoConteudo:1,version:1,ultimoEventoId:'confirmarFatura__key',createdAt:Timestamp.fromMillis(1),updatedAt:Timestamp.fromMillis(1)}
 memory.results=[{id:'card__2026-11',data:()=>v}];memory.docs.set('users/A/faturas/card__2026-11',v)
 expect(await createFaturasQueries(db,ctx).prever('card','2026-10-10')).toMatchObject({ok:true,valor:{estado:'sugestao'}})
 memory.docs.set('users/A/faturas/card__2026-11',{...v,version:2})
 expect(await createFaturasQueries(db,ctx).prever('card','2026-10-10')).toMatchObject({ok:false,erro:{codigo:'integridadeIndeterminada'}})
})
it('índice ausente não baixa histórico e resposta tardia não retorna prévia',async()=>{
 memory.queryError=Object.assign(Error('private URL'),{code:'failed-precondition'})
 const out=await createFaturasQueries(db,ctx).prever('card','2026-10-10')
 expect(out).toMatchObject({ok:false,erro:{codigo:'configuracaoPendente'}})
 expect(JSON.stringify(out)).not.toContain('private URL')
 expect(memory.reads.length).toBe(1)
 let checks=0
 expect(await createFaturasQueries(db,{...ctx,atual:()=>++checks===1}).prever('card','2026-10-10')).toMatchObject({ok:false,erro:{codigo:'semPermissao'}})
})
it('pagina por cartão/período com cursor contextual e denuncia histórico faltante',async()=>{
 const {Timestamp}=await import('firebase/firestore'),b=calendarioBaseFatura('2026-11',10,17);if(!b.ok)throw Error('fixture')
 const v={...b.valor,cartaoId:'card',schemaVersion:1,versaoConteudo:1,version:1,ultimoEventoId:'confirmarFatura__key',createdAt:Timestamp.fromMillis(1),updatedAt:Timestamp.fromMillis(1)}
 memory.results=[{id:'card__2026-11',data:()=>v}]
 const q=createFaturasQueries(db,ctx),input={cartaoId:'card',inicio:'2026-01',fim:'2027-12',pagina:1},first=await q.listar(input)
 expect(first).toMatchObject({ok:true,valor:{fim:false,cursor:{competencia:'2026-11',uid:'A',generation:1}}})
 if(!first.ok||!first.valor.cursor)throw Error('fixture')
 memory.results=[]
 expect(await q.listar({...input,cursor:first.valor.cursor})).toMatchObject({ok:true,valor:{fim:true,itens:[]}})
 expect(memory.constraints).toContainEqual(['startAfter','2026-11','card__2026-11'])
 expect(await q.listar({...input,cursor:{...first.valor.cursor,generation:2}})).toMatchObject({ok:false,erro:{codigo:'valorInvalido'}})
 expect(await q.historico('card__2026-11',0,1)).toMatchObject({ok:false,erro:{codigo:'integridadeIndeterminada'}})
})
it('duas contenções históricas diferentes são conflito, sem escolher a primeira linha',async()=>{
 const {Timestamp}=await import('firebase/firestore'),a=calendarioBaseFatura('2026-10',10,17),b=calendarioBaseFatura('2026-11',12,17);if(!a.ok||!b.ok)throw Error('fixture')
 const meta={cartaoId:'card',schemaVersion:1,versaoConteudo:1,version:1,ultimoEventoId:'confirmarFatura__key',createdAt:Timestamp.fromMillis(1),updatedAt:Timestamp.fromMillis(1)},x={...a.valor,...meta},y={...b.valor,...meta,inicio:'2026-09-12',calendarioOrigem:{...b.valor.calendarioOrigem,origemInicio:'vizinhoConfirmado'}}
 memory.results=[{id:'card__2026-10',data:()=>x},{id:'card__2026-11',data:()=>y}];memory.docs.set('users/A/faturas/card__2026-10',x);memory.docs.set('users/A/faturas/card__2026-11',y)
 expect(await createFaturasQueries(db,ctx).prever('card','2026-10-09')).toMatchObject({ok:true,valor:{estado:'conflito'}})
})
