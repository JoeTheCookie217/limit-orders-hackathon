import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    svgr(),
    nodePolyfills({
      protocolImports: true,
    }),
    // ESLint disabled for now
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
      define: { global: 'globalThis' },
      supported: { bigint: true },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        silenceDeprecations: ['legacy-js-api'],
      },
    },
  },
  build: {
    target: 'esnext',
    sourcemap: false,
  },
});
