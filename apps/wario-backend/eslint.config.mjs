// @ts-check
import globals from 'globals';
import { defineConfig } from "eslint/config";
import { default as main } from "../../eslint.config.mjs";

export default defineConfig([
  main,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Disable react rules inherited from root
      "react/jsx-no-target-blank": "off",
      "react-refresh/only-export-components": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "off",
    }
  },
]);
