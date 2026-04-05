import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH from .env (e.g. "/a2a-ui"), passed via VITE_BASE_PATH
const basePath = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the backend, matching the base path prefix
      [`${basePath === '/' ? '' : basePath}/api`]: {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
