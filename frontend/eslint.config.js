import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import react from 'eslint-plugin-react'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: { react },
    settings: { react: { version: 'detect' } },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      // Count JSX identifiers as variable usage — without this, a component
      // used only in JSX is reported "unused" and undefined JSX identifiers
      // (the MRIStep crash) slip through lint silently.
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'off',
    },
  },
  {
    // Providers intentionally export hooks/constants alongside their
    // component; HMR granularity loss is acceptable there.
    files: ['src/providers/**', 'src/shared/motion/**', 'src/features/analysis/AnalysisLoader.jsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
