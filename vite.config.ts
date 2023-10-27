import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    clearMocks: true,
    coverage: {
      enabled: true,
      exclude: ['**/*.test.ts'],
      include: ['src/**/*.ts']
    },
    restoreMocks: true
  }
});
