import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      // server-only throws at runtime in non-server environments;
      // stub it out in the test environment so unit tests can import server modules
      'server-only': path.resolve(__dirname, '__mocks__/server-only.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['lib/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
      exclude: [
        '**/__tests__/**',
        '**/*.test.{ts,tsx}',
        '**/__mocks__/**',
        '**/*.d.ts',
      ],
    },
  },
})
