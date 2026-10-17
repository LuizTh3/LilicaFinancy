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
