import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': { target: env.VITE_PROXY_TARGET || 'http://localhost:3001', changeOrigin: true }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: { vendor: ['react', 'react-dom'], xlsx: ['xlsx'] }
        }
      }
    }
  };
});
