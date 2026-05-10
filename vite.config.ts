import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/api/pedidos': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/inventario': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
      '/api/envios': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/notificaciones': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/health/pedidos': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: () => '/',
      },
      '/health/inventario': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        rewrite: () => '/',
      },
      '/health/notificaciones': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: () => '/',
      },
      '/health/envios': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: () => '/',
      },
    },
  },
})
