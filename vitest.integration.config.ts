import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

Object.assign(process.env, loadEnv('integration', process.cwd(), ''))
const group = process.env.TEST_INTEGRATION_GROUP ?? 'access'
const groups = ['access', 'session', 'firstLogin', 'registration', 'admin', 'trusted-api', 'notifications', 'cadastros', 'externos']
if (!groups.includes(group)) throw new Error('TEST_INTEGRATION_GROUP inválido')

export default defineConfig({ test: {
  environment: 'node', include: [`tests/integration/${group}.integration.test.ts`],
  fileParallelism: false, maxWorkers: 1, testTimeout: 30000, hookTimeout: 30000,
  setupFiles: ['tests/integration/support/preflight.ts'],
} })
