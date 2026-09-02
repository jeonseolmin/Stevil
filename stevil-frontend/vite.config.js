import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/rag-api": {
        target: "http://127.0.0.1:8091",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rag-api/, "/api"),
        timeout: 100000,
        proxyTimeout: 100000,
      },
      "/api": {
        target: "http://127.0.0.1:8080",
        // Keep the browser host so Spring recognizes this as a same-origin request.
        changeOrigin: false,
      },
    },
  },
})
