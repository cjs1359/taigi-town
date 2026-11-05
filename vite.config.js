import { defineConfig } from 'vite';

export default defineConfig({
  base: '/taigi-town/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
