import { defineConfig } from 'vite';

// Static-deployable build. No backend, no runtime network calls (BUILD_SPEC 47, 50).
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
    assetsDir: 'assets',
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
