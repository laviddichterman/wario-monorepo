import { parser as tsParser, plugin as tseslint, configs as typescriptEslintConfigs } from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import packageJsonPlugin from "eslint-plugin-package-json";
import jsoncParser from "jsonc-eslint-parser";
import perfectionist from "eslint-plugin-perfectionist";
import globals from 'globals';
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
    // Disable unified-signatures due to bug with discriminated unions in eslint/js
    "@typescript-eslint/unified-signatures": "off",
    "react/jsx-no-target-blank": "error",
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  };
};

const sortImportsRules = () => {
  const groups = {
    mui: 'custom-mui',
    wcp: 'custom-wcp',
    auth: 'custom-auth',
    hooks: 'custom-hooks',
    utils: 'custom-utils',
    types: 'custom-types',
    routes: 'custom-routes',
    sections: 'custom-sections',
    components: 'custom-components',
  };

  return {
    // 1) Whole import statement ordering
    'perfectionist/sort-imports': ['warn', {
      type: 'natural',
      ignoreCase: true,
      environment: 'node',
      // classify internal paths (monorepo + common app aliases)
      internalPattern: ['^@/.+', '^src/.+', '^\.\./', '^\./'],

      // one blank line between groups (stable, readable)
      newlinesBetween: 1,

      // explicit, predictable groups (value/type pairs)
      groups: [
        'side-effect-style',                 // e.g. import './reset.css'
        'side-effect-import',                // e.g. import './setup'
        ['value-builtin', 'type-builtin'],
        ['value-external', 'type-external'],

        // your custom buckets come next
        groups.mui,
        groups.wcp,
        groups.routes,
        groups.hooks,
        groups.utils,
        groups.components,
        groups.sections,
        groups.auth,
        groups.types,

        ['value-internal', 'type-internal'],
        ['value-parent', 'type-parent'],
        ['value-sibling', 'type-sibling'],
        ['value-index', 'type-index'],

        'value-style',
        'unknown'
      ],

      // mirror patterns for value and type, so type-only imports stick with their group
      customGroups: {
        value: {
          [groups.mui]: ['^@mui/.+'],
          [groups.wcp]: ['^@wcp/.+'],
          [groups.auth]: ['^src/auth/.+', '^@/auth/.+'],
          [groups.hooks]: ['^src/hooks/.+', '^@/hooks/.+'],
          [groups.utils]: ['^src/utils/.+', '^@/utils/.+'],
          [groups.types]: ['^src/types/.+', '^@/types/.+'],
          [groups.routes]: ['^src/routes/.+', '^@/routes/.+'],
          [groups.sections]: ['^src/sections/.+', '^@/sections/.+'],
          [groups.components]: ['^src/components/.+', '^@/components/.+'],
        },
        type: {
          [groups.mui]: ['^@mui/.+'],
          [groups.wcp]: ['^@wcp/.+'],
          [groups.auth]: ['^src/auth/.+', '^@/auth/.+'],
          [groups.hooks]: ['^src/hooks/.+', '^@/hooks/.+'],
          [groups.utils]: ['^src/utils/.+', '^@/utils/.+'],
          [groups.types]: ['^src/types/.+', '^@/types/.+'],
          [groups.routes]: ['^src/routes/.+', '^@/routes/.+'],
          [groups.sections]: ['^src/sections/.+', '^@/sections/.+'],
          [groups.components]: ['^src/components/.+', '^@/components/.+'],
        }
      }
    }],

    // 2) Named specifier ordering (inside a single import/export)
    'perfectionist/sort-named-imports': ['warn', { type: 'natural', order: 'asc', ignoreCase: true }],
    'perfectionist/sort-named-exports': ['warn', { type: 'natural', order: 'asc', ignoreCase: true }],

    // 3) Exports order (by statement)
    'perfectionist/sort-exports': ['warn', { type: 'natural', order: 'asc', groupKind: 'values-first' }],
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
  languageOptions: {
    parser: tsParser,
    globals: { ...globals.browser, ...globals.node },
    parserOptions: {
      projectService: true,
      tsconfigRootDir: process.cwd(),
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
  }
};

export default defineConfig([
  {
    ignores: ["**/dist/**", "**/build/**", "**/.next/**", "**/coverage/**", "**/node_modules/**", "**/eslint.config.*"],
  },
  tsConfig,
  packageJsonConfig
]);
