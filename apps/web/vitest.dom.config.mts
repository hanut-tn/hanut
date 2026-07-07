import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Suite séparée du vitest.config.mts principal (environment: 'node') pour ne
// pas changer l'environnement des ~360 tests de logique pure existants.
// Ne couvre que le rendu de composants React (jsdom + Testing Library).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': __dirname,
      '@hanut/types': resolve(__dirname, '../../packages/types/src/index.ts'),
    },
  },
  test: {
    clearMocks: true,
    environment: 'jsdom',
    globals: false,
    include: ['__tests__/dom/**/*.test.tsx'],
    restoreMocks: true,
    setupFiles: ['./vitest.dom.setup.ts'],
  },
})
