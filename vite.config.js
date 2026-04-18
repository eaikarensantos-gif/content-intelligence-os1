import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      '/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/anthropic/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'recharts-vendor': ['recharts'],
          'pdf-vendor': ['jspdf', 'html2canvas', 'pdfjs-dist'],
          'dnd-vendor': ['@hello-pangea/dnd'],
          'utils': ['papaparse', 'date-fns', 'uuid', 'xlsx'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
})
