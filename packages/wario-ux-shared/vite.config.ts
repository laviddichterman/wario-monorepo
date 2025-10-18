import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [react(), dts({ tsconfigPath: './tsconfig.json', entryRoot: 'src', outDir: 'dist/types' })],
  build: {
    target: 'es2022',
    lib: {
      entry: 'src/index.ts', formats: ['es'], fileName: () => 'index.js'
    },
    rollupOptions: {
      // keep deps external to avoid bundling react/mui
      external: ['react', 'react-dom', '@mui/material', '@mui/system', '@emotion/react', '@emotion/styled', 'motion', 'date-fns'],
      //output: { preserveModules: true, preserveModulesRoot: 'src' }
    }
  }
});