import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@utsav/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
  build: {
    sourcemap: false,
    target: 'es2022',
    rollupOptions: {
      output: {
        // Libraries change far less often than app code, so they get their own long-cached
        // chunk. GSAP stays out of it: it is lazy-loaded with the dashboard.
        manualChunks: (id) =>
          id.includes('node_modules') && !id.includes('gsap') ? 'vendor' : undefined,
      },
    },
  },
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}'],
      reporter: ['text-summary'],
      // CI fails if the web app loses test coverage.
      thresholds: { lines: 90, functions: 85, branches: 85 },
    },
  },
});
