import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const publicKeys = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID', 'VITE_TRUSTED_API_BASE_URL', 'VITE_TURNSTILE_SITE_KEY']
  return {
    plugins: [react()],
    // Expose only consumed public fields; preserve unrelated/legacy local entries.
    envPrefix: [],
    define: Object.fromEntries(publicKeys.map(key => [`import.meta.env.${key}`, JSON.stringify(env[key] ?? '')])),
  }
})
