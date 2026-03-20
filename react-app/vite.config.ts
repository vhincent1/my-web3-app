import react from '@vitejs/plugin-react';

import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  root: './client',
  define: {
    // Some legacy libraries check for 'global' or 'process.env'
    global: 'window',
  },
  plugins: [
    react(),
    nodePolyfills({
      // This ensures the polyfills are available to all modules
      include: ['buffer', 'process', 'stream', 'util'],
      globals: {
        Buffer: true,
        process: true,
      },
    }),
  ],
  // optimizeDeps: {
  //   // This prevents Vite from trying to pre-bundle these libraries
  //   // where the shim error usually occurs.
  //   include: ['buffer', 'process'],
  //   esbuildOptions: {
  //     target: 'esnext',
  //   },
  // },
  // oxc: {
  //   inject: {
  //     Buffer: ['vite-plugin-node-polyfills/shims/buffer', 'default'],
  //     global: ['vite-plugin-node-polyfills/shims/global', 'default'],
  //     process: ['vite-plugin-node-polyfills/shims/process', 'default'],
  //   },
  // },
  resolve: {
    alias: {
      // This is the CRITICAL fix for the "./shims/process" error
      // It forces Vite to use the standard process polyfill instead of searching internal paths
      'buffer/': 'buffer',
      'process/': 'process',
    },
  },
  server: {
    port: 3000,
  },
});
