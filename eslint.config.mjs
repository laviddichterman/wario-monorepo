import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import packageJsonPlugin from "eslint-plugin-package-json";
import jsoncParser from "jsonc-eslint-parser";

export default [
  { ignores: ["**/dist/**", "**/build/**", "**/.next/**", "**/coverage/**"] },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
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
    },
    settings: { react: { version: "detect" } },
    rules: {
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
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["**/package.json"],
    languageOptions: { parser: jsoncParser },
    plugins: { "package-json": packageJsonPlugin },
    rules: {
      // Canonical top-level key order (name, version, scripts, deps, etc.)
      "package-json/order-properties": "error",
      // Alphabetize dependency blocks (dependencies, devDependencies, peerDependencies, etc.)
      "package-json/sort-collections": "error",
    },
  },
];
