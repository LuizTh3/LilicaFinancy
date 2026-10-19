import { expect, it } from 'vitest'
import { environmentForGroup } from './environment'
const values = {
 TEST_INTEGRATION_GROUP: 'cartoesFaturas', TEST_EXPECTED_PROJECT_ID: 'test-project', VITE_FIREBASE_PROJECT_ID: 'test-project', TEST_RUN_ID: 'cards-123456',
 VITE_FIREBASE_API_KEY: 'fixture', VITE_FIREBASE_AUTH_DOMAIN: 'fixture', VITE_FIREBASE_APP_ID: 'fixture',
 ...Object.fromEntries(['A','B','ADMIN','PENDING'].flatMap(label => [['TEST_USER_'+label+'_UID',label],['TEST_USER_'+label+'_EMAIL',label+'@example.test'],['TEST_USER_'+label+'_PASSWORD','fixture-only']]))
}
it('grupo006 exige quatro papéis e alvo independente antes de conectar', () => {
 expect(environmentForGroup(values).uids).toEqual(['A','B','ADMIN','PENDING'])
 for(const field of ['UID','EMAIL','PASSWORD']) expect(()=>environmentForGroup({...values,['TEST_USER_PENDING_'+field]:undefined})).toThrow()
 expect(()=>environmentForGroup({...values,TEST_USER_PENDING_UID:'A'})).toThrow('INVALID_TEST_SCOPE')
 expect(()=>environmentForGroup({...values,TEST_EXPECTED_PROJECT_ID:'another'})).toThrow('PROJECT_MISMATCH')
})
