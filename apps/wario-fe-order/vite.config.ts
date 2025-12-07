import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';

export const PORT = 3000;
export default defineConfig({
  plugins: [
    react(),
    checker({
      typescript: true,
      eslint: {
        useFlatConfig: true,
        lintCommand: 'eslint "./src/**/*.{js,jsx,ts,tsx}"',
        dev: { logLevel: ['error'] },
      },
      overlay: {
        position: 'tl',
        initialIsOpen: false,
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  build: {
    target: 'es2022',
    //   rollupOptions: {
    //     output: {
    //       manualChunks(id) {
    //         if (id.includes('node_modules')) {
    //           // React and Redux related libs
    //           if (/react|react-dom|react-redux|@reduxjs\/toolkit/.test(id)) {
    //             return 'react-vendor';
    //           }
    //           // All MUI packages (core, icons, lab, data-grid, etc)
    //           if (id.includes('@mui/')) {
    //             return 'mui-vendor';
    //           }
    //           // Internal Wario shared packages
    //           if (id.includes('@wcp/wario-')) {
    //             return 'wario-shared';
    //           }
    //           // Fallback: other node_modules go into "vendor"
    //           return 'vendor';
    //         }
    //       }
    //     }
    //   }
  },
  optimizeDeps: { esbuildOptions: { target: 'es2022' } },
  server: { port: PORT, host: true },
  preview: { port: PORT, host: true },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      src: fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
