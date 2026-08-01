import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const generatedFiles = [
  ".next/**",
  "node_modules*/**",
  "next-env.d.ts",
];

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: generatedFiles,
  },
];

export default eslintConfig;
