import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    restoreMocks: true,
    globals: true,
    exclude: ["stripe/**", "node_modules/**"],
  },
});
