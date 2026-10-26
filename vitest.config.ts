import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["packages/*/test/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    allowOnly: false,
    passWithNoTests: false,
    expect: { requireAssertions: true },
    coverage: {
      provider: "v8",
      enabled: true,
      include: ["packages/*/src/**/*.ts"],
      exclude: [],
      reporter: ["text", "json", "json-summary", "lcov"],
      thresholds: {
        perFile: true,
        statements: 80,
        functions: 80,
        lines: 80,
        branches: 75,
      },
    },
  },
});
