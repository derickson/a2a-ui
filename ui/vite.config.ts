import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Backend port and BASE_PATH from env
const backendPort = process.env.VITE_BACKEND_PORT || process.env.PORT || '8000';
// BASE_PATH from env (e.g. "/a2a-ui"), ensure trailing slash for Vite base
const rawBase = (process.env.VITE_BASE_PATH || '').replace(/\/+$/, '');
const base = rawBase ? `${rawBase}/` : '/';

export default defineConfig({
  base,
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to backend
      [`${rawBase}/api`]: {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
