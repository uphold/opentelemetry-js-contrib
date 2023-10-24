/**
 * Module dependencies.
 */

import { defineConfig } from 'vitest/config';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Constants.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Export config.
 */

export default defineConfig({
  test: {
    clearMocks: true,
    coverage: {
      enabled: true,
      exclude: ['**/*.test.ts'],
      include: ['src/**/*.ts']
    },
    restoreMocks: true,
  }
});
