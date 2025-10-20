import { parser as tsParser, plugin as tseslint, configs as typescriptEslintConfigs } from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import packageJsonPlugin from "eslint-plugin-package-json";
import jsoncParser from "jsonc-eslint-parser";
import perfectionist from "eslint-plugin-perfectionist";
import { defineConfig } from "eslint/config";

const basicRules = () => {
  return {
    "@typescript-eslint/consistent-type-imports": [
      "warn",
      { fixStyle: "inline-type-imports" },
    ],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "react/jsx-no-target-blank": "error",
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  };
};


/* @rules sort or imports/exports
 * from 'eslint-plugin-perfectionist'.
 */
const sortImportsRules = () => {
  const customGroups = {
    mui: ['custom-mui'],
    auth: ['custom-auth'],
    hooks: ['custom-hooks'],
    utils: ['custom-utils'],
    types: ['custom-types'],
    routes: ['custom-routes'],
    sections: ['custom-sections'],
    components: ['custom-components'],
  };

  return {
    'perfectionist/sort-named-imports': [1, { type: 'line-length', order: 'asc' }],
    'perfectionist/sort-named-exports': [1, { type: 'line-length', order: 'asc' }],
    'perfectionist/sort-exports': [
      1,
      {
        order: 'asc',
        type: 'line-length',
        groupKind: 'values-first',
      },
    ],
    'perfectionist/sort-imports': [
      2,
      {
        order: 'asc',
        ignoreCase: true,
        type: 'line-length',
        environment: 'node',
        maxLineLength: 120,
        newlinesBetween: 'always',
        internalPattern: ["^@/.+", "^src/.+"],
        groups: [
          'style',
          'side-effect',
          'type',
          ['builtin', 'external'],
          customGroups.mui,
          customGroups.routes,
          customGroups.hooks,
          customGroups.utils,
          customGroups.components,
          customGroups.sections,
          customGroups.auth,
          customGroups.types,
          'internal',
          ['parent', 'sibling', 'index'],
          ['parent-type', 'sibling-type', 'index-type'],
          'object',
          'unknown',
        ],
        customGroups: {
          value: {
            [customGroups.mui]: ['^@mui/.+'],
            [customGroups.auth]: ['^src/auth/.+', '^@/auth/.+'],
            [customGroups.hooks]: ['^src/hooks/.+', '^@/hooks/.+'],
            [customGroups.utils]: ['^src/utils/.+', '^@/utils/.+'],
            [customGroups.types]: ['^src/types/.+', '^@/types/.+'],
            [customGroups.routes]: ['^src/routes/.+', '^@/routes/.+'],
            [customGroups.sections]: ['^src/sections/.+', '^@/sections/.+'],
            [customGroups.components]: ['^src/components/.+', '^@/components/.+'],
          },
        },
      },
    ],
  };
};


const packageJsonConfig = {
  files: ["**/package.json"],
  languageOptions: { parser: jsoncParser },
  plugins: { "package-json": packageJsonPlugin },
  rules: {
    // Canonical top-level key order (name, version, scripts, deps, etc.)
    "package-json/order-properties": "error",
    // Alphabetize dependency blocks (dependencies, devDependencies, peerDependencies, etc.)
    "package-json/sort-collections": "error",
  },
};

const tsConfig = {
  files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
  ignores: ["**/dist/**", "**/build/**", "**/.next/**", "**/coverage/**"],
  languageOptions: {
    parser: tsParser,
    globals: {},
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  plugins: {
    "@typescript-eslint": tseslint,
    react,
    "react-hooks": reactHooks,
    "react-refresh": reactRefresh,
    perfectionist
  },
  settings: { react: { version: "detect" } },
  extends: [
    typescriptEslintConfigs.strictTypeChecked
  ],
  rules: {
    ...basicRules(),
    ...sortImportsRules(),
    // // Perfectionist: common-sense in-line ordering
    // "perfectionist/sort-named-imports": ["warn", { type: "natural", order: "asc", ignoreCase: true }],
    // "perfectionist/sort-named-exports": ["warn", { type: "natural", order: "asc", ignoreCase: true }],
    // "perfectionist/sort-interfaces": [
    //   "warn",
    //   { type: "natural", order: "asc", ignoreCase: true, partitionByNewLine: true }
    // ],
    // "perfectionist/sort-union-types": ["warn", { type: "natural", order: "asc", ignoreCase: true }],
    // "perfectionist/sort-intersection-types": ["warn", { type: "natural", order: "asc", ignoreCase: true }],
    // "perfectionist/sort-objects": [
    //   "warn",
    //   {
    //     type: "natural",
    //     order: "asc",
    //     ignoreCase: true,
    //     partitionByNewLine: true
    //   }
    // ]
  }
};

export default defineConfig([
  tsConfig,
  packageJsonConfig
]);
