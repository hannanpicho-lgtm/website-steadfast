import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
      '@utils': path.resolve(__dirname, './utils'),
    },
  },

  build: {
    target: ['es2020', 'chrome80', 'safari13.1', 'firefox78'],
    reportCompressedSize: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks — split heavy dependencies
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router/')) return 'vendor-react';
          if (id.includes('node_modules/lucide-react/')) return 'vendor-icons';
          if (id.includes('node_modules/@supabase/')) return 'vendor-supabase';
          if (id.includes('node_modules/sonner/')) return 'vendor-toast';
          if (id.includes('node_modules/framer-motion/')) return 'vendor-animation';
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) return 'vendor-i18n';

          // Shared layout components used by 12-14 pages — deduplicate into one chunk
          if (
            id.includes('/components/Header') ||
            id.includes('/components/BottomNavigation') ||
            id.includes('/components/LiveChatBox')
          ) {
            return 'layout';
          }
        },
      },
    },
    minify: 'esbuild',
    cssMinify: true,
    assetsInlineLimit: 4096,
  },

  esbuild: {
    drop: ['debugger'],
    pure: ['console.log', 'console.info', 'console.warn'],
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
