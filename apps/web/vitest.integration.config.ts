import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['__tests__/integration/**/*.test.ts'],
    testTimeout: 30000,
    // Sequential — integration tests share DB state and must not run in parallel.
    sequence: { concurrent: false },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
