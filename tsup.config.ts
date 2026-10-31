import { defineConfig } from "tsup";

const shared = {
  external: ["react", "react/jsx-runtime"],
  format: ["esm" as const],
  dts: true,
};

export default defineConfig([
  {
    ...shared,
    entry: {
      index: "src/index.ts",
      "client/index": "src/client/index.ts",
      "server/index": "src/server/index.ts",
      "postgres/index": "src/postgres/index.ts",
      "payload/index": "src/payload/index.ts",
      "payload/admin-view": "src/payload/admin/view.tsx",
    },
    clean: false,
  },
  {
    ...shared,
    // Payload loads these through the host's import map as client components.
    entry: {
      "payload/nav-link": "src/payload/admin/nav-link.tsx",
      "payload/admin-filters": "src/payload/admin/filters.tsx",
    },
    banner: { js: '"use client";' },
    clean: false,
  },
]);
