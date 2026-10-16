import { getApp, getApps, initializeApp } from 'firebase/app'
import { initializeAuth, browserSessionPersistence } from 'firebase/auth'
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore'

let client: ReturnType<typeof createClient> | undefined
export function configurationError(env: Record<string, unknown>) {
  const keys = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID']
  const missing = keys.filter(key => typeof env[key] !== 'string' || !(env[key] as string).trim())
  if (missing.length) return `Configuração incompleta: ${missing.join(', ')}`
  const invalid = [
    !/^[a-z0-9][a-z0-9-]{3,62}$/.test(String(env.VITE_FIREBASE_PROJECT_ID)) ? 'VITE_FIREBASE_PROJECT_ID' : '',
    !/^[a-zA-Z0-9.-]+$/.test(String(env.VITE_FIREBASE_AUTH_DOMAIN)) ? 'VITE_FIREBASE_AUTH_DOMAIN' : '',
    !/^\d+:\d+:web:[a-zA-Z0-9]+$/.test(String(env.VITE_FIREBASE_APP_ID)) ? 'VITE_FIREBASE_APP_ID' : '',
  ].filter(Boolean)
  return invalid.length ? `Configuração inválida: ${invalid.join(', ')}` : ''
}
function createClient() {
  const env = import.meta.env
  const error = configurationError(env)
  if (error) throw new Error(error)
  const app = getApps().length ? getApp() : initializeApp({ apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID, appId: env.VITE_FIREBASE_APP_ID })
  return { app, auth: initializeAuth(app, { persistence: browserSessionPersistence }), db: initializeFirestore(app, { localCache: memoryLocalCache() }) }
}
export function firebase() { return client ??= createClient() }
