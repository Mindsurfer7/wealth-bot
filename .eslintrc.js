module.exports = {
    env: {
      browser: true,
      node: true,
      es2021: true,
    },
    extends: [
      'eslint:recommended',
      'plugin:prettier/recommended', // Включает Prettier в ESLint
    ],
    parserOptions: {
      ecmaVersion: 12,
      sourceType: 'module',
    },
    rules: {
      'prettier/prettier': 'error', // Ошибки форматирования будут отмечаться ESLint
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  };