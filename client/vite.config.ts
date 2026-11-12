import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_TARGET = process.env.VITE_DEV_API_TARGET ?? 'http://localhost:4000'

export default defineConfig({
  plugins: [react()],
  // Absolute base: the SPA is served from the domain root and every deep
  // link (/product/x, /orders/y) is rewritten to index.html by .htaccess,
  // so a relative './assets/...' path would resolve under that route.
  base: '/',
  server: {
    port: 5173,
    // The Express API in ../server runs on 4000. Same-origin /api calls in dev.
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    // Generates a single-page app — all routes served from index.html
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
