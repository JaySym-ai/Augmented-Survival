import { defineConfig } from 'vite';
import path from 'path';
import { WEB_BUILD_BASE, WEB_DEV_SERVER_PORT } from './src/config/WebBuildConfig';

export default defineConfig({
  root: __dirname,
  base: WEB_BUILD_BASE,
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
    port: WEB_DEV_SERVER_PORT,
    open: true,
  },
});

