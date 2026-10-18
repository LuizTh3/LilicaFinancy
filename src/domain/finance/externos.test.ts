import { expect, it } from 'vitest'
import { normalizarComandoExterno, planejarCriacaoExterna } from './externos'
const dados={natureza:'despesa',descricao:' Internet ',categoriaId:'cat-1',valorCentavos:10000,competenciaPlanejamento:'2026-10',vencimento:'2026-11-10',dataConsumo:'2026-10-18'}
const comando={contractVersion:1,tipo:'criarDespesa',operationKey:'key-1',origemId:'origin-1',expectedVersion:0,dados}
const ctx={uid:'A',agora:1000,referencias:[{id:'cat-1',uid:'A',colecao:'categorias' as const,estado:'ativo' as const,natureza:'despesa' as const}]}
const valid=()=>{const c=normalizarComandoExterno(comando,'2026-10-18');if(!c.ok)throw Error('fixture');return c.valor}
it('normaliza os dados opcionais e preserva competência, ocorrência e vencimento independentes',()=>{
 const result=normalizarComandoExterno({...comando,dados:{...dados,observacao:'  ',etiquetaIds:[]}},'2026-10-18')
 expect(result).toMatchObject({ok:true,valor:{dados:{descricao:'Internet',estimado:false,competenciaPlanejamento:'2026-10',dataConsumo:'2026-10-18',vencimento:'2026-11-10'}}})
 if(result.ok&&'dados'in result.valor){expect(result.valor.dados).not.toHaveProperty('observacao');expect(result.valor.dados).not.toHaveProperty('etiquetaIds')}
 const planned=planejarCriacaoExterna(valid(),ctx)
 expect(planned).toMatchObject({ok:true,valor:{origem:{liquidadoLiquidoCentavos:0,jaLiquidada:false,version:1,ultimoEventoId:'criarDespesa__key-1'},evento:{id:'criarDespesa__key-1',resultVersion:1}}})
 if(planned.ok)expect(planned.valor.evento).not.toHaveProperty('fato')
})
it('recusa ausência de ocorrência, datas impossíveis e valores inexatos sem truncar',()=>{
 for(const patch of [{dataConsumo:undefined},{dataConsumo:'2026-02-30'},{vencimento:'2026-13-01'},{valorCentavos:0},{valorCentavos:-1},{valorCentavos:1.1},{valorCentavos:Number.MAX_SAFE_INTEGER+1},{ownerUid:'B'}])expect(normalizarComandoExterno({...comando,dados:{...dados,...patch}},'2026-10-18').ok).toBe(false)
 for(const valorCentavos of [1,Number.MAX_SAFE_INTEGER])expect(normalizarComandoExterno({...comando,dados:{...dados,valorCentavos}},'2026-10-18').ok).toBe(true)
})
it('valida individualmente cinco etiquetas e rejeita duplicadas, extras, arquivadas ou de outro UID',()=>{
 const ids=['e5','e1','e3','e2','e4']
 const c=normalizarComandoExterno({...comando,dados:{...dados,etiquetaIds:ids}},'2026-10-18')
 expect(c).toMatchObject({ok:true,valor:{dados:{etiquetaIds:['e1','e2','e3','e4','e5']}}})
 if(!c.ok)throw Error('fixture')
 const refs=[...ctx.referencias,...ids.map(id=>({id,uid:'A',colecao:'etiquetas' as const,estado:'ativo' as const}))]
 expect(planejarCriacaoExterna(c.valor,{...ctx,referencias:refs}).ok).toBe(true)
 for(const id of ids)for(const bad of [{estado:'arquivado' as const},{uid:'B'}])expect(planejarCriacaoExterna(c.valor,{...ctx,referencias:refs.map(r=>r.id===id?{...r,...bad}:r)}).ok).toBe(false)
 for(const etiquetaIds of [['e1','e1'],['e1','e2','e3','e4','e5','e6']])expect(normalizarComandoExterno({...comando,dados:{...dados,etiquetaIds}},'2026-10-18').ok).toBe(false)
})
it('exige natureza correta e vínculos existentes ativos no mesmo papel/UID',()=>{
 for(const refs of [[],ctx.referencias.map(r=>({...r,uid:'B'})),ctx.referencias.map(r=>({...r,natureza:'receita' as const})),ctx.referencias.map(r=>({...r,estado:'arquivado' as const}))])expect(planejarCriacaoExterna(valid(),{...ctx,referencias:refs}).ok).toBe(false)
 const c=normalizarComandoExterno({...comando,dados:{...dados,titularId:'holder-1',contaPrevistaId:'account-1'}},'2026-10-18')
 if(!c.ok)throw Error('fixture')
 expect(planejarCriacaoExterna(c.valor,ctx).ok).toBe(false)
})
