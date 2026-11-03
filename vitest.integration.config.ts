import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import { integrationGroup } from './tests/integration/support/environment'

Object.assign(process.env, loadEnv('integration', process.cwd(), ''))
const group = integrationGroup(process.env.TEST_INTEGRATION_GROUP)

export default defineConfig({ test: {
  environment: 'node', include: group === 'painel' ? ['tests/integration/painel*.integration.test.ts'] : group === 'liquidacoesFaturas' ? ['tests/integration/liquidacoesFaturas*.integration.test.ts'] : group === 'cartoesFaturas' ? ['tests/integration/cartoes.integration.test.ts','tests/integration/faturas.integration.test.ts'] : group === 'comprasCartao' ? ['tests/integration/compras.integration.test.ts', 'tests/integration/compras-gates.integration.test.ts'] : [`tests/integration/${group}.integration.test.ts`],
  fileParallelism: false, maxWorkers: 1, testTimeout: 30000, hookTimeout: 30000,
  setupFiles: ['tests/integration/support/preflight.ts'],
} })
