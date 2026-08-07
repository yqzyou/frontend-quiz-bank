import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@lib': resolve(__dirname, 'src/lib'),
      '@components': resolve(__dirname, 'src/components'),
      '@islands': resolve(__dirname, 'src/components/islands'),
    },
    extensions: ['.ts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
  },
  server: {
    deps: {
      inline: [/@gray-matter/, /gray-matter/],
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts', 'src/components/**/*.tsx'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
    environmentMatchGlobs: [
      ['tests/unit/**/*.dom.test.tsx', 'happy-dom'],
      ['tests/unit/components/**', 'happy-dom'],
    ],
    setupFiles: ['tests/setup.ts'],
  },
});
