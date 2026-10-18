import { expect, it } from 'vitest'
import { externosEnvironment } from './environment'

const configured = {
 TEST_EXPECTED_PROJECT_ID: 'test-project', VITE_FIREBASE_PROJECT_ID: 'test-project', TEST_RUN_ID: 'run12345',
 VITE_FIREBASE_API_KEY: 'fixture', VITE_FIREBASE_AUTH_DOMAIN: 'fixture', VITE_FIREBASE_APP_ID: 'fixture',
 ...Object.fromEntries(['A','B','ADMIN','PENDING'].flatMap(label => [['TEST_USER_'+label+'_UID', label], ['TEST_USER_'+label+'_EMAIL', label+'@example.test'], ['TEST_USER_'+label+'_PASSWORD', 'fixture-only']]))
}
it('exige alvo independente e quatro papéis distintos antes de conectar', () => {
 expect(externosEnvironment(configured).uids).toEqual(['A','B','ADMIN','PENDING'])
 expect(() => externosEnvironment({ ...configured, TEST_EXPECTED_PROJECT_ID: 'different' })).toThrow('PROJECT_MISMATCH')
 for (const label of ['A','B','ADMIN','PENDING']) for (const field of ['UID','EMAIL','PASSWORD']) {
  expect(() => externosEnvironment({ ...configured, ['TEST_USER_'+label+'_'+field]: undefined })).toThrow()
 }
 expect(() => externosEnvironment({ ...configured, TEST_USER_PENDING_UID: 'A' })).toThrow('INVALID_TEST_SCOPE')
 expect(() => externosEnvironment({ ...configured, TEST_RUN_ID: '../unsafe' })).toThrow('INVALID_TEST_SCOPE')
})
