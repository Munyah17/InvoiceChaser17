import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        entryFileNames:  'assets/[name]-[hash].js',
        chunkFileNames:  'assets/[name]-[hash].js',
        assetFileNames:  'assets/[name]-[hash][extname]',
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-stripe':   ['@stripe/stripe-js'],
          'vendor-pdf':      ['html2canvas', 'jspdf'],
        },
      },
    },
  },

  server: {
    port: 4181,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },

  preview: {
    port: 4181,
  },
})
