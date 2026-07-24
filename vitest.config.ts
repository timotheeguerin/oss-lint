import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    isolate: false,
    exclude: ["node_modules", "dist", ".temp"],
  },
});
