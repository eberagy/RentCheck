import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    // Default to node for lib/ tests (pure functions, schemas, server
    // utilities). Hook + component tests opt into jsdom via a
    // `// @vitest-environment jsdom` pragma at the top of the file —
    // saves the jsdom import cost for the 250+ pure tests.
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['lib/**/*.test.ts', 'tests/**/*.test.{ts,tsx}', 'hooks/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'hooks/**/*.ts'],
      exclude: ['lib/**/*.test.ts', 'hooks/**/*.test.ts', 'tests/**'],
    },
  },
})
