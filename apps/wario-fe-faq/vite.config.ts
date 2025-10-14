import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
const PORT = 3001;
export default defineConfig({
  plugins: [react()],
  build: { target: 'es2022' },
  optimizeDeps: { esbuildOptions: { target: 'es2022' } },
  server: { port: PORT, host: true },
  preview: { port: PORT, host: true },
});