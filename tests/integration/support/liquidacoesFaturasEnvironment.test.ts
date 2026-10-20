import { expect, it } from 'vitest'
import { environmentForGroup, integrationClientLabels } from './environment'

const values: Record<string,string|undefined> = {
 TEST_INTEGRATION_GROUP:'liquidacoesFaturas', TEST_EXPECTED_PROJECT_ID:'test-project', VITE_FIREBASE_PROJECT_ID:'test-project', TEST_RUN_ID:'liquidacoes-123456',
 VITE_FIREBASE_API_KEY:'fixture', VITE_FIREBASE_AUTH_DOMAIN:'fixture', VITE_FIREBASE_APP_ID:'fixture',
 ...Object.fromEntries(['A','B','ADMIN','PENDING'].flatMap(role=>['UID','EMAIL','PASSWORD'].map(field=>[`TEST_USER_${role}_${field}`,field==='UID'?role:'fixture-only'])))
}
it('liquidações exigem quatro usuários distintos e visitante antes de conectar',()=>{
 expect(environmentForGroup(values).uids).toEqual(['A','B','ADMIN','PENDING'])
 expect(integrationClientLabels('liquidacoesFaturas')).toEqual(['A','B','visitor','ADMIN','PENDING'])
 for(const role of ['ADMIN','PENDING']) for(const field of ['UID','EMAIL','PASSWORD']) expect(()=>environmentForGroup({...values,[`TEST_USER_${role}_${field}`]:undefined})).toThrow('Configuração ausente')
 expect(()=>environmentForGroup({...values,TEST_USER_PENDING_UID:'A'})).toThrow('INVALID_TEST_SCOPE')
 expect(()=>environmentForGroup({...values,TEST_EXPECTED_PROJECT_ID:'other'})).toThrow('PROJECT_MISMATCH')
 expect(()=>environmentForGroup({...values,TEST_INTEGRATION_GROUP:'liquidacaoFatura'})).toThrow('TEST_INTEGRATION_GROUP')
})
