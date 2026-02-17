import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/game/',
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@world': path.resolve(__dirname, 'src/world'),
      '@entities': path.resolve(__dirname, 'src/entities'),
      '@systems': path.resolve(__dirname, 'src/systems'),
      '@interaction': path.resolve(__dirname, 'src/interaction'),
      '@audio': path.resolve(__dirname, 'src/audio'),
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@shaders': path.resolve(__dirname, 'src/shaders'),
    },
  },
  worker: {
    format: 'es',
  },
});
