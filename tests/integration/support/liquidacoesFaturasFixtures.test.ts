import { expect, it } from 'vitest'
import { liquidacoesFaturasFixtures } from './liquidacoesFaturasFixtures'
import { cleanupOrder } from './cleanup'
it('planeja IDs repetíveis, isolados por execução, sem enviar ou descobrir dados',()=>{
 const scope={projectId:'fixture-project',runId:'liquidacoes-123456',uids:['A','B']}
 const result=liquidacoesFaturasFixtures(scope,'A')
 expect(result).toEqual(liquidacoesFaturasFixtures(scope,'A'))
 expect(result.manifest.documents).toHaveLength(13)
 expect(cleanupOrder(result.manifest.documents)).toHaveLength(13)
 expect(liquidacoesFaturasFixtures({...scope,runId:'liquidacoes-654321'},'A').invoiceId).not.toBe(result.invoiceId)
 expect(()=>liquidacoesFaturasFixtures(scope,'C')).toThrow('INVALID_TEST_SCOPE')
 expect(()=>liquidacoesFaturasFixtures({...scope,runId:'bad/path'},'A')).toThrow('INVALID_TEST_SCOPE')
 expect(()=>liquidacoesFaturasFixtures({...scope,runId:'x'.repeat(41)},'A')).toThrow('INVALID_TEST_SCOPE')
})
