import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backend = { target: 'http://127.0.0.1:8080', changeOrigin: false };
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': { ...backend, timeout: 110000, proxyTimeout: 110000 },
      '/oauth2': backend,
      '/login/oauth2': backend,
      '/ws-stomp': { ...backend, ws: true },
      '/rag-api': {
        target: 'http://127.0.0.1:8091', changeOrigin: true,
        rewrite: path => path.replace(/^\/rag-api/, '/api'),
        timeout: 110000, proxyTimeout: 110000,
      },
    },
  },
});
