import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** `npm run eval`: the live eval against the real model. Never part of `npm test`. */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/live/**/*.test.ts"],
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
