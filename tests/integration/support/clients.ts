import { initializeApp, deleteApp } from 'firebase/app'
import { initializeAuth, inMemoryPersistence, signInWithEmailAndPassword } from 'firebase/auth'
import { initializeFirestore, memoryLocalCache, terminate } from 'firebase/firestore'
import { integrationEnvironment, cadastrosEnvironment } from './environment'
export async function integrationClients() {
  const env = process.env, scope = (env.TEST_INTEGRATION_GROUP === 'cadastros' ? cadastrosEnvironment : integrationEnvironment)(env)
  const labels = env.TEST_INTEGRATION_GROUP === 'cadastros' ? ['A','B','visitor','ADMIN','PENDING'] : ['A','B','visitor']
  const clients = labels.map(label => {
    const app = initializeApp({ projectId: scope.projectId, apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, appId: env.VITE_FIREBASE_APP_ID }, `${scope.runId}-${label}-${crypto.randomUUID()}`)
    return { app, auth: initializeAuth(app, { persistence: inMemoryPersistence }), db: initializeFirestore(app, { localCache: memoryLocalCache() }) }
  })
  try {
    for (const label of labels.filter(label => label !== 'visitor')) {
      const index = labels.indexOf(label)
      const user = (await signInWithEmailAndPassword(clients[index].auth, env[`TEST_USER_${label}_EMAIL`]!, env[`TEST_USER_${label}_PASSWORD`]!)).user
      if (user.uid !== env[`TEST_USER_${label}_UID`]) throw new Error('TEST_UID_MISMATCH')
    }
  } catch { await Promise.all(clients.map(async client => { await terminate(client.db); await deleteApp(client.app) })); throw new Error('Integração bloqueada: autenticação/UID de teste inválidos') }
  return { scope, a: clients[0], b: clients[1], visitor: clients[2], admin: clients[3], pending: clients[4], close: async () => { await Promise.all(clients.map(async client => { await terminate(client.db); await deleteApp(client.app) })) } }
}
