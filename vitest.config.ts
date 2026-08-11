import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Pure Node environment — semaforo.ts has zero DOM/network deps
    environment: 'node',
    include: ['lib/__tests__/**/*.test.ts'],
    globals: true,
  },
})
