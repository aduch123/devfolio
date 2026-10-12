import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

// Run from the repo root (see the "lint" script) so backend and frontend are both covered.
export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/generated/**",
      "backend/prisma/**",
      "backend/prisma.config.ts",
    ],
  },
  js.configs.recommended,
  {
    files: ["backend/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
  {
    files: ["frontend/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
    },
  },
  {
    // Express error handlers need all four arguments even when some are unused.
    rules: { "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }] },
  },
  prettier,
];
