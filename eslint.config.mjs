import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Global Ignores following industry best practices
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".agents/**",
    "coverage/**",
    "node_modules/**",
  ]),
  {
    rules: {
      // Allow <img> for Google Favicon API external domain icons
      "@next/next/no-img-element": "off",
      // Unused vars pattern rule (allows _prefix for unused parameters)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      // Explicit any warning rule
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
