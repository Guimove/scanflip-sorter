import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'dist/'] },
  js.configs.recommended,
  {
    files: ['popup.js', 'page-helpers.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, chrome: 'readonly' }
    }
  },
  {
    files: ['scripts/**/*.mjs', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.node }
  }
];
