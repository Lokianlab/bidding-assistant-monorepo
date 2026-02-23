import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    pool: "vmThreads",
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/vitest.setup.ts"],
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "src/data/**/*.ts"],
      exclude: [
        "src/lib/**/__tests__/**",
        "src/**/*.d.ts",
        "src/lib/context/**",
        "src/lib/**/use*.ts",         // React hooks — need component-level tests
        "src/lib/notion/**",          // API client — need integration tests
        "src/lib/performance/**",     // Hook-heavy — need component-level tests
        "src/lib/**/types.ts",        // Type-only files
      ],
      reporter: ["text", "text-summary"],
      thresholds: {
        statements: 70,
        branches: 55,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
