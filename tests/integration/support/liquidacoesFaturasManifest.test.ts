import { expect, it } from 'vitest'
import { validateManifest, type Manifest } from './manifest'
import { cleanupOrder } from './cleanup'

const entry=(path:string)=>({path,owner:'A',createdByRun:true as const,registeredAt:'2026-10-19T00:00:00Z'})
const base:Manifest={projectId:'p',runId:'run12345',uids:['A'],documents:[]}
const paths=['users/A/faturas/card-1__2026-10','users/A/compras/compra-1','users/A/parcelasCartao/compra-1__r1__n1','users/A/operacoesLiquidacoesFaturas/pagarFatura__op-1','users/A/controlesPagamentosFaturas/pagarFatura__op-1__e1','users/A/controlesItensFaturas/parcelaCartao__compra-1__r1__n1','users/A/controlesAjustesFaturas/corrigirItem__op-2__e1','users/A/operacoesLiquidacoesFaturas/corrigirItem__op-2']
const valid=(items:string[])=>validateManifest({...base,documents:items.map(entry)},'p','run12345',['A'])
it('inventaria fatos e capacidades vinculados às origens delimitadas',()=>{
 expect(valid(paths)).toHaveLength(paths.length)
 for(const path of paths.slice(4,7)) expect(()=>valid([path])).toThrow('MANIFEST_SCOPE')
 for(const path of ['users/B/operacoesLiquidacoesFaturas/pagarFatura__op-1','users/A/operacoesLiquidacoesFaturas/apagar__op-1','users/A/controlesItensFaturas/parcelaCartao__compra-1__r1__n13','users/A/controlesPagamentosFaturas/reembolso__op-1__e1','users/A/controlesAjustesFaturas/pagarFatura__op-1__e1']) expect(()=>valid([...paths,path])).toThrow('MANIFEST_SCOPE')
})
it('ordena apenas alvos inventariados sem tocar a lista original',()=>{
 const docs=paths.map(entry), before=structuredClone(docs), ordered=cleanupOrder(docs).map(doc=>doc.path)
 expect(ordered.indexOf(paths[4])).toBeLessThan(ordered.indexOf(paths[3]))
 expect(ordered.indexOf(paths[5])).toBeLessThan(ordered.indexOf(paths[2]))
 expect(ordered.indexOf(paths[6])).toBeLessThan(ordered.indexOf(paths[7]))
 expect(new Set(ordered)).toEqual(new Set(paths))
 expect(docs).toEqual(before)
})
