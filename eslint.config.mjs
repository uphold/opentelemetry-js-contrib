import tseslint from 'typescript-eslint';
import uphold from 'eslint-config-uphold';
import vitest from '@vitest/eslint-plugin';

export default tseslint.config([
  {
    extends: [uphold],
    name: 'uphold-config'
  },
  tseslint.configs.recommended,
  {
    files: ['**/*.test.ts'],
    plugins: { vitest },
    rules: vitest.configs.recommended.rules
  },
  {
    ignores: ['**/node_modules', '**/dist']
  }
]);
