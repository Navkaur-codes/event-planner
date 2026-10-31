import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      reporter: ['text-summary'],
      // The engine owns every number and date in a plan, so it must stay thoroughly tested.
      thresholds: { 'src/engine/**': { lines: 90, functions: 90, branches: 85 } },
    },
  },
});
