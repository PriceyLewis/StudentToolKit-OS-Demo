// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    files: ['src/utils/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
  {
    ignores: ['dist/*'],
  },
]);
