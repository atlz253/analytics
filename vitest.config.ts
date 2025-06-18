import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    watch: false,
    include: ["packages/**/tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "packages/**/tests/*.integration.test.ts"],
  },
});
