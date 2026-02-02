

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwind from '@tailwindcss/vite';
import path from 'path';
import { webcrypto } from 'crypto';

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as Crypto;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwind()],
    server: {
      port: 3000,
      open: true,
      host: true,
      // Fix para WebSocket - usa porta dinâmica automaticamente
      hmr: {
        protocol: 'ws',
        host: 'localhost'
        // Removido port/clientPort fixo - Vite detecta automaticamente
      },
      watch: {
        // Usar polling para evitar problemas com OneDrive
        usePolling: true,
        interval: 1000
      }
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.')
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom', '@supabase/supabase-js']
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom']
          }
        }
      }
    }
  }
});
