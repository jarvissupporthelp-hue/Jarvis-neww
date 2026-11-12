import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/math-lab/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: '../public/math-lab',
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: false,
  },
});
