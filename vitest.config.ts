import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        extends: false,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/**/*.test.ts"],
          exclude: [...configDefaults.exclude, "src/client/**/*.test.ts"],
        },
      },
      {
        extends: false,
        test: {
          name: "client",
          environment: "jsdom",
          include: ["src/client/**/*.test.ts"],
          exclude: [...configDefaults.exclude],
        },
      },
    ],
  },
});
