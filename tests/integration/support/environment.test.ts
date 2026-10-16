import { expect, it } from 'vitest'
import { integrationEnvironment } from './environment'
it('refuses missing configuration and wrong targets before creating any client', () => {
  expect(() => integrationEnvironment({})).toThrow('Integração bloqueada')
  const values = Object.fromEntries(['TEST_EXPECTED_PROJECT_ID', 'TEST_RUN_ID', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_APP_ID', 'TEST_USER_A_UID', 'TEST_USER_B_UID', 'TEST_USER_A_EMAIL', 'TEST_USER_A_PASSWORD', 'TEST_USER_B_EMAIL', 'TEST_USER_B_PASSWORD'].map(key => [key, 'placeholder']))
  expect(() => integrationEnvironment({ ...values, VITE_FIREBASE_PROJECT_ID: 'different', TEST_USER_B_UID: 'other' })).toThrow('PROJECT_MISMATCH')
  expect(() => integrationEnvironment({ ...values, VITE_FIREBASE_PROJECT_ID: 'placeholder', TEST_EXPECTED_PROJECT_ID: 'placeholder' })).toThrow('INVALID_TEST_SCOPE')
})
