import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative base path for Azure Web Apps deployment
  base: './',
  build: {
    // Output to dist folder
    outDir: 'dist',
    // Generate source maps for debugging
    sourcemap: true,
    // Optimize bundle
    minify: 'esbuild',
    // Rollup options for chunking
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          motion: ['framer-motion'],
          excel: ['xlsx'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  // Preview server config (for local testing)
  preview: {
    port: 4173,
    host: true,
  },
})
