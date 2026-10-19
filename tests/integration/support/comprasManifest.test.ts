import { expect, it } from 'vitest'
import { validateManifest } from './manifest'
import type { Manifest } from './manifest'
import { cleanupOrder } from './cleanup'

const entry = (path: string) => ({path,owner:'A',createdByRun:true as const,registeredAt:'2026-10-18T00:00:00Z'})
const base: Manifest = {projectId:'p',runId:'run12345',uids:['A'],documents:[]}
const paths = ['users/A/compras/compra-1','users/A/parcelasCartao/compra-1__r1__n1','users/A/operacoesCompras/criarCompra__op-1','users/A/operacoesCompras/editarCompra__op-2','users/A/operacoesCompras/cancelarCompra__op-3','users/A/faturas/card-1__2027-02','users/A/controlesFaturas/card-1__2027-02']
const valid = (items: string[]) => validateManifest({...base,documents:items.map(entry)},'p','run12345',['A'])
it('inventaria explicitamente compra, revisão, recibos e controle da fatura', () => {
 expect(valid(paths)).toHaveLength(7)
 for (const number of [1,12]) expect(valid(['users/A/compras/compra-1',`users/A/parcelasCartao/compra-1__r9007199254740991__n${number}`])).toHaveLength(2)
})
it('nega proprietário, coleção, revisão/ordinal e caminhos não delimitados', () => {
 for (const path of ['users/B/compras/compra-1','users/A/compras/bad_id','users/A/parcelasCartao/compra-1__r0__n1','users/A/parcelasCartao/compra-1__r9007199254740992__n1','users/A/parcelasCartao/compra-1__r1__n13','users/A/operacoesCompras/pagar__op-1','users/A/controlesFaturas/card-1__2027-13','users/A/pagamentos/op-1','users/A/compras/compra-1/parcelas/item']) {
  expect(() => valid([...paths,path])).toThrow('MANIFEST_SCOPE')
 }
})
it('não autoriza limpar parcela/controle sem sua origem inventariada', () => {
 expect(() => valid(['users/A/parcelasCartao/compra-1__r1__n1'])).toThrow('MANIFEST_SCOPE')
 expect(() => valid(['users/A/controlesFaturas/card-1__2027-02'])).toThrow('MANIFEST_SCOPE')
})
it('ordena dependências007 sem descobrir novos alvos nem alterar inventário', () => {
 const docs = paths.map(entry), before = structuredClone(docs)
 const ordered = cleanupOrder(docs).map(doc => doc.path)
 expect(ordered.indexOf(paths[1])).toBeLessThan(ordered.indexOf(paths[0]))
 expect(ordered.indexOf(paths[6])).toBeLessThan(ordered.indexOf(paths[5]))
 expect(docs).toEqual(before)
 expect(new Set(ordered)).toEqual(new Set(paths))
})
