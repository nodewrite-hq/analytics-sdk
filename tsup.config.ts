import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "client/index": "src/client/index.ts",
    "server/index": "src/server/index.ts",
    "postgres/index": "src/postgres/index.ts",
    "payload/index": "src/payload/index.ts",
    "payload/admin-view": "src/payload/admin/view.tsx",
    "payload/nav-link": "src/payload/admin/nav-link.tsx",
  },
  external: ["react", "react/jsx-runtime"],
  format: ["esm"],
  dts: true,
  clean: true,
});
