import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

/**
 * Root Vitest configuration for React testing.
 * This config is used by `pnpm test:react` scripts.
 *
 * Backend tests use Jest and should be run with `pnpm backend:test`.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // wario-ux-shared uses @ alias for src
      '@': resolve(__dirname, './packages/wario-ux-shared/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'packages/wario-test-utils/src/**/*.{test,spec}.{ts,tsx}',
      'packages/wario-ux-shared/src/**/*.{test,spec}.{ts,tsx}',
      'packages/wario-fe-ux-shared/src/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', 'apps/wario-backend/**'],
    setupFiles: ['./packages/wario-test-utils/src/setup.ts'],
  },
});
