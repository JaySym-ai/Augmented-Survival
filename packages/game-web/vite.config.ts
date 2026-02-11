import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: __dirname,
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@game-core': path.resolve(__dirname, '../game-core/src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});

