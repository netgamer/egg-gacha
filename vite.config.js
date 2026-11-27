import { defineConfig } from 'vite';

// base: './' keeps every asset URL relative so the build runs from a
// GitHub Pages project subpath (https://<user>.github.io/<repo>/).
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2019',
    cssCodeSplit: false,
    reportCompressedSize: false,
  },
  server: { port: 5173, host: '0.0.0.0' },
});
