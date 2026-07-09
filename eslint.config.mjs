import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt([
  {
    rules: {
      semi: ['error', 'always'], // требовать точку с запятой
      quotes: ['error', 'single'], // одинарные кавычки
      'prettier/prettier': 'error', // подключение стилей Prettier
    },
  },
]);
