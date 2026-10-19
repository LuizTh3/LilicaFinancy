import { expect, it } from 'vitest'
import { environmentForGroup, integrationClientLabels } from './environment'

const values: Record<string, string | undefined> = {
 TEST_INTEGRATION_GROUP: 'comprasCartao', TEST_EXPECTED_PROJECT_ID: 'test-project', VITE_FIREBASE_PROJECT_ID: 'test-project', TEST_RUN_ID: 'compras-123456',
 VITE_FIREBASE_API_KEY: 'fixture', VITE_FIREBASE_AUTH_DOMAIN: 'fixture', VITE_FIREBASE_APP_ID: 'fixture',
 ...Object.fromEntries(['A','B','ADMIN','PENDING'].flatMap(label => ['UID','EMAIL','PASSWORD'].map(field => [`TEST_USER_${label}_${field}`, field === 'UID' ? label : 'fixture-only'])))
}
it('exige os quatro papéis privados antes de conectar compras', () => {
 expect(environmentForGroup(values).uids).toEqual(['A','B','ADMIN','PENDING'])
 expect(integrationClientLabels('comprasCartao')).toEqual(['A','B','visitor','ADMIN','PENDING'])
 for (const role of ['ADMIN','PENDING']) for (const field of ['UID','EMAIL','PASSWORD']) {
  expect(() => environmentForGroup({...values,[`TEST_USER_${role}_${field}`]:undefined})).toThrow('Configuração ausente')
 }
 expect(() => environmentForGroup({...values,TEST_USER_PENDING_UID:'A'})).toThrow('INVALID_TEST_SCOPE')
 expect(() => environmentForGroup({...values,TEST_EXPECTED_PROJECT_ID:'another'})).toThrow('PROJECT_MISMATCH')
})
it('não transforma grupo desconhecido em suíte de acesso antiga', () => {
 expect(() => environmentForGroup({...values,TEST_INTEGRATION_GROUP:'compraCartao'})).toThrow('TEST_INTEGRATION_GROUP')
 expect(environmentForGroup({...values,TEST_INTEGRATION_GROUP:'access',TEST_USER_PENDING_UID:undefined}).uids).toEqual(['A','B'])
})
