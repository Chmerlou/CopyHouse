import eslint from '@eslint/js';
import babelParser from '@babel/eslint-parser';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  eslint.configs.recommended,
  {
    languageOptions: {
      parser: babelParser,
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          plugins: [['@babel/plugin-proposal-decorators', { legacy: true }]],
        },
      },
    },
  },
];
