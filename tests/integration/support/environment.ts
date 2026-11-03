import { painelManifest } from './painelFixtures'
export function integrationEnvironment(values: Record<string, string | undefined>) {
  const required = ['TEST_EXPECTED_PROJECT_ID', 'TEST_RUN_ID', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_APP_ID', 'TEST_USER_A_UID', 'TEST_USER_B_UID', 'TEST_USER_A_EMAIL', 'TEST_USER_A_PASSWORD', 'TEST_USER_B_EMAIL', 'TEST_USER_B_PASSWORD']
  const missing = required.filter(key => !values[key])
  if (missing.length) throw new Error(`Integração bloqueada. Configuração ausente: ${missing.join(', ')}`)
  if (values.TEST_EXPECTED_PROJECT_ID !== values.VITE_FIREBASE_PROJECT_ID) throw new Error('PROJECT_MISMATCH: abortado antes de conexão/fixtures')
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(values.TEST_RUN_ID!) || values.TEST_USER_A_UID === values.TEST_USER_B_UID) throw new Error('INVALID_TEST_SCOPE')
  if ([values.TEST_USER_A_UID, values.TEST_USER_B_UID].some(uid => !/^[A-Za-z0-9_-]{1,128}$/.test(uid!))) throw new Error('INVALID_TEST_SCOPE')
  return { projectId: values.TEST_EXPECTED_PROJECT_ID!, runId: values.TEST_RUN_ID!, uids: [values.TEST_USER_A_UID!, values.TEST_USER_B_UID!] }
}
export function cadastrosEnvironment(values: Record<string, string | undefined>) {
  const base = integrationEnvironment(values)
  for (const label of ['ADMIN', 'PENDING']) for (const key of ['UID', 'EMAIL', 'PASSWORD']) {
    if (!values[`TEST_USER_${label}_${key}`]) throw new Error(`Configuração ausente: TEST_USER_${label}_${key}`)
  }
  const uids = [...base.uids, values.TEST_USER_ADMIN_UID!, values.TEST_USER_PENDING_UID!]
  if (new Set(uids).size !== 4 || uids.some(uid => !/^[A-Za-z0-9_-]{1,128}$/.test(uid))) throw new Error('INVALID_TEST_SCOPE')
  return { ...base, uids }
}
// Financial integration has the same four-role isolation gate as catalog tests.
export const externosEnvironment = cadastrosEnvironment
export function painelEnvironment(values: Record<string, string | undefined>) {
 const scope = cadastrosEnvironment(values)
 if (scope.projectId !== 'lilicafinancy') throw Error('PROJECT_MISMATCH: painel011')
 if (values.TEST_PAINEL_READS_AUTHORIZED !== 'yes' || values.TEST_PAINEL_FIXTURES_READY !== 'yes') throw Error('PAINEL_READS_OR_FIXTURES_NOT_CONFIRMED')
 painelManifest(scope, values.TEST_PAINEL_MONTH ?? '')
 return scope
}
export const integrationGroups = ['access', 'session', 'firstLogin', 'registration', 'admin', 'trusted-api', 'notifications', 'cadastros', 'externos', 'cartoesFaturas', 'comprasCartao', 'liquidacoesFaturas', 'painel'] as const
export function integrationGroup(group = 'access') {
  if (!(integrationGroups as readonly string[]).includes(group)) throw new Error('TEST_INTEGRATION_GROUP inválido')
  return group
}
export function integrationClientLabels(group?: string): readonly string[] {
  return ['cadastros', 'externos', 'cartoesFaturas', 'comprasCartao', 'liquidacoesFaturas', 'painel'].includes(integrationGroup(group))
    ? ['A', 'B', 'visitor', 'ADMIN', 'PENDING'] as const : ['A', 'B', 'visitor'] as const
}
export function environmentForGroup(values: Record<string, string | undefined>) {
  if (integrationGroup(values.TEST_INTEGRATION_GROUP) === 'painel') return painelEnvironment(values)
  return integrationClientLabels(values.TEST_INTEGRATION_GROUP).length === 5 ? cadastrosEnvironment(values) : integrationEnvironment(values)
}
