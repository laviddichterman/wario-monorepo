import { resolve } from 'path';

import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        '@emotion/react',
        '@emotion/styled',
        '@mui/material',
        '@tanstack/react-query',
        '@testing-library/react',
        '@testing-library/jest-dom',
        '@testing-library/user-event',
      ],
    },
  },
  test: {
    name: 'wario-test-utils',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
