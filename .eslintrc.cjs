/**
 * ESLint configuration.
 *
 * Classic (.eslintrc) format rather than flat config, to match the ESLint 8
 * pinned in package.json.
 */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: 'detect' } },
  rules: {
    // Props are documented with JSDoc rather than checked at runtime.
    'react/prop-types': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-empty': ['error', { allowEmptyCatch: true }],
  },
  overrides: [
    {
      // Everything outside src/ runs in Node, not the browser: the Vite
      // config, its plugins, and the smoke test. They get `process`, `Buffer`
      // and friends; src/ deliberately does not.
      files: ['vite.config.js', 'vite-plugins/**/*.js', 'scripts/**/*.mjs'],
      env: { node: true, browser: false },
    },
  ],
};
