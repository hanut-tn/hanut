import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['__tests__/integration/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Integration files share one local database.
    fileParallelism: false,
    sequence: { concurrent: false },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
