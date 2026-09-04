import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // useActionState hands every action (prevState, formData), and most
      // actions bound with .bind() need neither. Naming them `_prevState` /
      // `_formData` is the signal that they're required by the signature,
      // not forgotten — 25 of these were the bulk of the lint output.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Deno edge function: different runtime, different globals and module
    // resolution (npm:/jsr: specifiers), so the Next/TS config doesn't apply.
    "supabase/functions/**",
  ]),
]);

export default eslintConfig;
