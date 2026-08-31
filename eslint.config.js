import { defineConfig, globalIgnores } from 'eslint/config'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import neostandard from 'neostandard'

export default defineConfig([
  ...neostandard({
    ts: true,
    noJsx: true,
  }),
  globalIgnores(['dist/**', 'scripts/**/*.js', '**/*.d.ts', '**/liqi.ts']),
  {
    rules: {
      eqeqeq: ['error', 'always'],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'no-unused-vars': 'off', // controlled by @typescript-eslint/no-unused-vars
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      globals: {
        __DEV__: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
  },
])
