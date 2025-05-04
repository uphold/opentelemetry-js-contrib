import tseslint from 'typescript-eslint';
import uphold from 'eslint-config-uphold';

export default tseslint.config([
  {
    extends: [uphold],
    name: 'uphold-config'
  },
  tseslint.configs.recommended,
  {
    ignores: ['**/node_modules', '**/dist']
  }
]);
