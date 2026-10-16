import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'services/trusted-api/src/**/*.test.ts', 'tests/integration/support/**/*.test.ts'],
  },
})
