import { expect, it } from 'vitest'
import { fixtureControle } from '../../../scripts/prepare-cadastros-fixtures.mts'
it('preparação só aceita controle e pai exatos do inventário',()=>{
 const documents=['users/A/contas/id','users/A/usoCadastros/contas__id'].map(path=>({path,owner:'A',createdByRun:true as const,registeredAt:'2026-10-17T00:00:00Z'}))
 const m={projectId:'p',runId:'run12345',uids:['A'],documents}
 expect(fixtureControle(m,'p','run12345','A','contas','id').path).toBe(documents[1].path)
 expect(()=>fixtureControle(m,'p','run12345','B','contas','id')).toThrow()
 expect(()=>fixtureControle(m,'p','run12345','A','contas','other')).toThrow()
})
