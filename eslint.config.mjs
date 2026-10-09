import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // `vercel build` writes a full copy of the compiled output here, including
    // bundled dependencies. Linting it produced 5,000+ problems in files that
    // are generated, not authored.
    ".vercel/**",
    "loadtest/**",
    ".preview/**",
  ]),
]);

export default eslintConfig;
