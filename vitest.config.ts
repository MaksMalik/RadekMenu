/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      'virtual:pwa-register': '/src/test/__mocks__/virtual-pwa-register.ts',
    },
  },
})
