import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import dts from 'vite-plugin-dts';
import { viteStaticCopy } from 'vite-plugin-static-copy';



export default defineConfig({
  plugins: [
    react(),
    dts({ tsconfigPath: './tsconfig.json', entryRoot: 'src', outDir: 'dist/types' }),
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
    viteStaticCopy({
      targets: [
        { src: 'src/generated/phone-metadata.custom.json', dest: '.' } // => dist/phone-metadata.custom.json
      ]
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'src': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    target: 'es2022',
    lib: {
      entry: 'src/index.ts', formats: ['es'], fileName: () => 'index.js'
    },
    rollupOptions: {
      // keep deps external to avoid bundling react/mui
      external: ['react', 'react-dom', '@mui/material', '@mui/system', '@emotion/react', '@emotion/styled', 'motion', 'date-fns', "numeral", 'axios', 'react-hook-form', 'react-imask', '@tanstack/react-query'],
      //output: { preserveModules: true, preserveModulesRoot: 'src' }
    }
  }
});