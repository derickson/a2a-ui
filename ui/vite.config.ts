import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
      // Proxy API calls: /a2a-ui/api/* → http://localhost:8000/a2a-ui/api/*
      [`${rawBase}/api`]: {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
