import { expect, it } from 'vitest'
import { integrationEnvironment, cadastrosEnvironment } from './environment'
it('refuses missing configuration and wrong targets before creating any client', () => {
  expect(() => integrationEnvironment({})).toThrow('Integração bloqueada')
  const values = Object.fromEntries(['TEST_EXPECTED_PROJECT_ID', 'TEST_RUN_ID', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_APP_ID', 'TEST_USER_A_UID', 'TEST_USER_B_UID', 'TEST_USER_A_EMAIL', 'TEST_USER_A_PASSWORD', 'TEST_USER_B_EMAIL', 'TEST_USER_B_PASSWORD'].map(key => [key, 'placeholder']))
  expect(() => integrationEnvironment({ ...values, VITE_FIREBASE_PROJECT_ID: 'different', TEST_USER_B_UID: 'other' })).toThrow('PROJECT_MISMATCH')
  expect(() => integrationEnvironment({ ...values, VITE_FIREBASE_PROJECT_ID: 'placeholder', TEST_EXPECTED_PROJECT_ID: 'placeholder' })).toThrow('INVALID_TEST_SCOPE')
})
it('isola exigências cadastrais dos grupos anteriores e exige papéis distintos',()=>{
 const values:Record<string,string>={TEST_EXPECTED_PROJECT_ID:'test-project',VITE_FIREBASE_PROJECT_ID:'test-project',TEST_RUN_ID:'run-20261017',VITE_FIREBASE_API_KEY:'ficticio',VITE_FIREBASE_AUTH_DOMAIN:'test.invalid',VITE_FIREBASE_APP_ID:'ficticio'}
 for(const label of ['A','B','ADMIN','PENDING'])for(const key of ['UID','EMAIL','PASSWORD'])values[`TEST_USER_${label}_${key}`]=key==='UID'?label:'ficticio'
 expect(cadastrosEnvironment(values).uids).toEqual(['A','B','ADMIN','PENDING'])
 expect(()=>cadastrosEnvironment({...values,TEST_USER_ADMIN_UID:'A'})).toThrow('INVALID_TEST_SCOPE')
 delete values.TEST_USER_PENDING_PASSWORD
 expect(integrationEnvironment(values).uids).toEqual(['A','B'])
 expect(()=>cadastrosEnvironment(values)).toThrow('Configuração ausente')
})
