import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8055',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:8055',
        changeOrigin: true,
      },
      '/server': {
        target: 'http://localhost:8055',
        changeOrigin: true,
      },
      '/users': {
        target: 'http://localhost:8055',
        changeOrigin: true,
      },
      '/files': {
        target: 'http://localhost:8055',
        changeOrigin: true,
      },
      '/assets': {
        target: 'http://localhost:8055',
        changeOrigin: true,
      },
    },
  },
});
