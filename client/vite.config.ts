import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_TARGET = process.env.VITE_DEV_API_TARGET ?? 'http://localhost:4000'

export default defineConfig({
  plugins: [react()],
  base: './',
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
