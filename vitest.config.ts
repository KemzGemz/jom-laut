import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    // Map ESM ".js" import specifiers to their ".ts" source (NodeNext style).
    extensionAlias: {
      '.js': ['.ts', '.js'],
    },
    alias: {
      '@jom-laut/shared-types': resolve(__dirname, 'packages/shared-types/src/index.ts'),
      '@jom-laut/validation': resolve(__dirname, 'packages/validation/src/index.ts'),
      '@jom-laut/domain': resolve(__dirname, 'packages/domain/src/index.ts'),
    },
  },
  test: {
    include: ['packages/**/*.{test,spec}.ts', 'apps/**/src/**/*.{test,spec}.ts', 'apps/customer-web/lib/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'node',
    reporters: 'default',
  },
});
