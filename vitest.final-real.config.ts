import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'

// Dedicated read-only suite. Reuses the existing five-role client setup, never its writers.
Object.assign(process.env, loadEnv('integration', process.cwd(), ''))
process.env.TEST_INTEGRATION_GROUP = 'cartoesFaturas'
export default defineConfig({ test: {
  environment: 'node', include: ['tests/integration/final-readonly.integration.test.ts'],
  fileParallelism: false, maxWorkers: 1, testTimeout: 60000, hookTimeout: 60000,
  reporters: ['default', 'json'], outputFile: { json: '.integration/final-readonly-vitest.json' },
  setupFiles: ['tests/integration/support/preflight.ts'],
} })
