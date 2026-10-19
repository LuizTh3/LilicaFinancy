import { expect, it } from 'vitest'
import { validateManifest } from './manifest'
import type { Manifest } from './manifest'
const document = (path: string) => ({path,owner:'A',createdByRun:true as const,registeredAt:'2026-10-18T00:00:00Z'})
const base: Manifest = {projectId:'p',runId:'run12345',uids:['A'],documents:[]}
it('inventaria caminhos006 fechados sem aceitar outros proprietários ou identidades inválidas', () => {
 const paths=['users/A/cartoes/card-1','users/A/faturas/card-1__2027-02','users/A/operacoesCartoes/criarCartao__op-1','users/A/operacoesFaturas/confirmarFatura__op-2']
 expect(validateManifest({...base,documents:paths.map(document)},'p','run12345',['A'])).toHaveLength(4)
 for(const path of ['users/B/cartoes/card-1','users/A/faturas/card-1__2027-13','users/A/faturas/card-1__1899-01','users/A/cartoes/card_1','users/A/operacoesCartoes/apagar__op-1','users/A/pagamentos/op-1']) {
  expect(()=>validateManifest({...base,documents:[document(path)]},'p','run12345',['A'])).toThrow('MANIFEST_SCOPE')
 }
})
