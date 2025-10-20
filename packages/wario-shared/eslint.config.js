import defaultConfig from "../../eslint.config.mjs";

export default [
  ...defaultConfig,
  {
    files: ['test/**/*.ts'],
    languageOptions: { globals: { jest: true } }
  }
]
