import { defineConfig } from 'vitest/config'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': __dirname,
      '@hanut/types': resolve(__dirname, '../../packages/types/src/index.ts'),
    },
  },
  test: {
    clearMocks: true,
    environment: 'node',
    globals: false,
    include: ['__tests__/**/*.test.ts'],
    restoreMocks: true,
  },
})
