import defaultConfig from '../../eslint.config.mjs';

export default [
  ...defaultConfig,
  {
    files: ['tests/**/*.ts'],
    languageOptions: { globals: { jest: true } },
  },
];
