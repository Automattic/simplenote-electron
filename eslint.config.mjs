import typescriptEslint from '@typescript-eslint/eslint-plugin';
import react from 'eslint-plugin-react';
import jest from 'eslint-plugin-jest';
import prettier from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import { fixupPluginRules } from '@eslint/compat';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: ['dist/', 'eslint.config.mjs'],
  },
  ...compat.extends(
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:jest/recommended',
    'prettier',
    'plugin:prettier/recommended',
    'plugin:react/recommended'
  ),
  {
    plugins: {
      '@typescript-eslint': typescriptEslint,
      react,
      jest,
      prettier,
      'react-hooks': fixupPluginRules(reactHooks),
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...jest.environments.globals.globals,
        ...globals.mocha,
        ...globals.node,
      },

      parser: tsParser,
      ecmaVersion: 6,
      sourceType: 'module',

      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    settings: {
      react: {
        version: 'detect',
      },
    },

    rules: {
      eqeqeq: ['error', 'always'],
      'no-console': 'warn',
      'no-lonely-if': 'error',
      'no-shadow': 'warn',
      'no-spaced-func': 'error',

      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
        },
      ],

      'react/display-name': 'warn',
      'react/no-deprecated': 'warn',
      'react/no-string-refs': 'warn',
      'react/prop-types': 'off',
      'vars-on-top': 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],

    rules: {
      'no-unused-vars': 'off',
    },
  },
];
