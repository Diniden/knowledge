import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const stylesDir = resolve(__dirname, 'ui/src/styles');

export default defineConfig({
  root: 'ui',
  plugins: [react()],
  resolve: {
    alias: {
      '@ui': resolve(__dirname, 'ui/src'),
      '@shared': resolve(__dirname, '../shared/src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Make the styles dir available so components can @use 'variables' as v;
        loadPaths: [stylesDir],
        // Use the modern Sass API
        api: 'modern-compiler' as const,
      },
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
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  optimizeDeps: {
    include: [],
  },
});
