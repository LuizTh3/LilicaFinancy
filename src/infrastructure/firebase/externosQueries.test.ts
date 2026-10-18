import { expect, it, vi } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { createExternosQueries } from './externosQueries'
import type { DocumentoLeituraExterna, QueryExterna, ReferenciaLeituraExterna, createExternosSnapshotReader } from './externosSnapshotReader'
import type { ConsultaExterna } from '../../domain/finance/contracts/externos'
const time='2026-10-18T12:00:00Z'
const snapshot={uid:'A',generation:1,readTime:time,expiresAt:Date.parse(time)+50*60000}
const consulta:ConsultaExterna={base:'planejamento',competencia:'2026-10',filtro:{natureza:'ambas'},pageSize:2}
function origin(id:string,natureza:'receita'|'despesa',date:string) {
 return {colecao:'lancamentosExternos' as const,id,dados:{natureza,descricao:id,categoriaId:'cat-1',valorCentavos:100,estimado:false,competenciaPlanejamento:'2026-10',...(natureza==='receita'?{dataPrevista:date}:{vencimento:date,dataConsumo:date}),schemaVersion:1,version:1,createdAt:Timestamp.fromMillis(1000),updatedAt:Timestamp.fromMillis(1000),estadoObrigacao:'ativa',liquidadoLiquidoCentavos:0,jaLiquidada:false,ultimoEventoId:(natureza==='receita'?'criarReceita':'criarDespesa')+'__'+id}}
}
function fixture() {
 const entries=[origin('r-1','receita','2026-10-01'),origin('d-1','despesa','2026-10-02'),origin('r-2','receita','2026-10-03'),origin('d-2','despesa','2026-10-04'),origin('d-3','despesa','2026-10-05')]
 const reader={iniciar:vi.fn(async()=>snapshot),consultar:vi.fn(async(t:typeof snapshot,q:QueryExterna)=>{
  expect(t).toEqual(snapshot)
  if(q.colecao!=='lancamentosExternos')return []
  return entries.filter(e=>e.dados.natureza===q.natureza&&(!q.apos||('dataPrevista'in e.dados?e.dados.dataPrevista:e.dados.vencimento)!>q.apos.data||(('dataPrevista'in e.dados?e.dados.dataPrevista:e.dados.vencimento)===q.apos.data&&e.id>q.apos.id))).slice(0,q.pageSize)
 }),obter:vi.fn(async()=>[entries[0]])}
 return {reader,queries:createExternosQueries(reader,{uid:'A',generation:1,atual:()=>true}),entries}
}
it('intercala fontes sem pular itens já buscados mas ainda não consumidos',async()=>{
 const f=fixture(),ids:string[]=[]
 let page=await f.queries.listar(consulta)
 while(page.ok){ids.push(...page.valor.itens.map(i=>i.origem.id));if(!page.valor.cursor)break;page=await f.queries.listar(consulta,page.valor.cursor)}
 expect(page.ok).toBe(true);expect(ids).toEqual(['r-1','d-1','r-2','d-2','d-3'])
 expect(f.reader.iniciar).toHaveBeenCalledTimes(1)
 if(page.ok)expect(page.valor.completo).toBe(true)
})
it('recusa mudança de consulta, UID e geração sem tratar páginas como completas',async()=>{
 const f=fixture(),page=await f.queries.listar(consulta)
 if(!page.ok||!page.valor.cursor)throw Error('fixture')
 const cursor=page.valor.cursor
 for(const bad of [{...cursor,snapshot:{...snapshot,uid:'B'}},{...cursor,snapshot:{...snapshot,generation:2}},{...cursor,consulta:{...consulta,competencia:'2026-11'}}])expect((await f.queries.listar(consulta,bad)).ok).toBe(false)
})
it('conserva a parcialidade quando um filtro não encontra linhas na página corrente',async()=>{
 const f=fixture(),page=await f.queries.listar({...consulta,filtro:{natureza:'ambas',categoriaId:'outra'}})
 expect(page).toMatchObject({ok:true,valor:{itens:[],completo:false}})
})
it('resolve nomes históricos no mesmo snapshot, incluindo cadastro arquivado',async()=>{
 const doc=origin('r-1','receita','2026-10-01'),at=Timestamp.fromMillis(1000)
 const dados={natureza:'receita',descricao:'r-1',categoriaId:'cat-1',valorCentavos:100,estimado:false,competenciaPlanejamento:'2026-10',dataPrevista:'2026-10-01'}
 const comando={contractVersion:1,tipo:'criarReceita',operationKey:'r-1',origemId:'r-1',expectedVersion:0,dados}
 const reader:ReturnType<typeof createExternosSnapshotReader>={iniciar:vi.fn(async()=>snapshot),consultar:vi.fn(async():Promise<DocumentoLeituraExterna[]>=>[{colecao:'operacoesExternas',id:'criarReceita__r-1',dados:{schemaVersion:1,contractVersion:1,tipo:'criarReceita',operationKey:'r-1',origemId:'r-1',natureza:'receita',expectedVersion:0,resultVersion:1,comando,depois:dados,createdAt:at}}]),obter:vi.fn(async(t:typeof snapshot,refs:readonly ReferenciaLeituraExterna[]):Promise<DocumentoLeituraExterna[]>=>{
  expect(t).toEqual(snapshot)
  return refs.map(ref=>ref.colecao==='lancamentosExternos'?doc:{...ref,dados:{nome:'Salário',estado:'arquivado',natureza:'receita',schemaVersion:1,version:2,createdAt:at,updatedAt:at,archivedAt:at}})
 })}
 const result=await createExternosQueries(reader,{uid:'A',generation:1,atual:()=>true}).detalhe('r-1')
 expect(result).toMatchObject({ok:true,valor:{referencias:{'categorias/cat-1':'Salário'},completo:true}})
 expect(reader.obter).toHaveBeenLastCalledWith(snapshot,[{colecao:'categorias',id:'cat-1'}])
})
