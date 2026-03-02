import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'ui/',
  resolve: {
    alias: {
      '@ui': resolve(__dirname, 'ui/src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:4000',
        ws: true,
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@ui/styles/variables" as *;\n@use "@ui/styles/mixins" as *;\n`,
      },
    },
  },
  build: {
    outDir: '../dist',
    sourcemap: true,
  },
});
