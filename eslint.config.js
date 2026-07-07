import js from "@eslint/js";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";

export default [
  {
    ignores: [
      "**/.next",
      "**/dist",
      "**/node_modules",
      "**/build",
      "**/*.d.ts",
      "**/.env*",
      ".turbo",
      ".turbo/**",
      "pnpm-lock.yaml",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        // Node.js globals
        Buffer: "readonly",
        console: "readonly",
        process: "readonly",
        global: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        // Browser globals used by the web app
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        Blob: "readonly",
        URL: "readonly",
        File: "readonly",
        FileReader: "readonly",
        DOMParser: "readonly",
        Document: "readonly",
        HTMLInputElement: "readonly",
        HTMLDivElement: "readonly",
        requestAnimationFrame: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": ts,
      react: react,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...ts.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-module-boundary-types": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["**/*.{tsx,jsx}"],
    languageOptions: {
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        React: "readonly",
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },
];
