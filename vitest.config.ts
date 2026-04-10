import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Default to node; individual files can override with @vitest-environment jsdom
    environment: 'node',
    globals: true,
    include: ['src/tests/**/*.test.{ts,tsx}'],
    exclude: ['src/tests/*.integration.test.{ts,tsx}'],
    setupFiles: ['src/tests/setup.ts'],
    testTimeout: 20_000, // API integration tests need more time
    coverage: {
      provider: 'v8',
      include: ['src/app/services/**', 'src/app/hooks/**', 'src/app/components/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@utils': path.resolve(__dirname, './utils'),
    },
  },
});
