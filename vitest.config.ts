import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Default to node; individual files can override with @vitest-environment jsdom
    environment: 'node',
    globals: true,
    include: ['src/tests/**/*.test.ts'],
    testTimeout: 20_000, // API integration tests need more time
    coverage: {
      provider: 'v8',
      include: ['src/app/services/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@utils': path.resolve(__dirname, './utils'),
    },
  },
});
