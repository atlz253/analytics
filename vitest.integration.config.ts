import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    watch: false,
    include: ["packages/**/tests/**/*.integration.test.ts"],
    testTimeout: 60000,
  },
});
