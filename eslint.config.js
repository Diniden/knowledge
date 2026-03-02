import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals: {
        ...globals.node,
        Bun: 'readonly',
      },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^[A-Z_]+$', // allow enum members
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports' },
      ],
      // '@typescript-eslint/no-floating-promises': 'error', // requires type-aware linting
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '**/dist/**',
      '**/*.config.*',
      'plans/**',
      '*.d.ts',
    ],
  },
  {
    files: ['client/**/*.ts', 'client/**/*.tsx'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['shared/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^([A-Z][A-Z0-9_]*|_)$', // enum members, intentionally unused
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    files: ['server/**/*.ts', 'scripts/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node, Bun: 'readonly' },
    },
    rules: { 'no-console': 'off' },
  },
];
