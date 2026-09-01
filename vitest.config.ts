import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    // e2e/ uses @playwright/test's own runner (`npm run test:e2e`), not
    // vitest — exclude it or vitest's default *.spec.ts glob picks it up and
    // fails on Playwright's incompatible test()/expect() imports.
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
});
