import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/companion': 'http://localhost:8000',
      '/screen': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/chat': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
      '/reports': 'http://localhost:8000',
      '/voice': 'http://localhost:8000',
      '/api': {
        target: 'http://localhost:8000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});