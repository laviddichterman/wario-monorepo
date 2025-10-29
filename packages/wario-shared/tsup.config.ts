import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  // build both formats
  format: ['esm', 'cjs'],
  dts: true,                 // one .d.ts for both
  target: 'es2022',
  sourcemap: true,
  clean: true,
  treeshake: true,
  // ensure predictable filenames
  outExtension({ format }) {
    return format === 'cjs' ? { js: '.cjs' } : { js: '.js' };
  }
});