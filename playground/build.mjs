import { build } from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

await build({
  absWorkingDir: dir,
  entryPoints: [join(dir, "page.ts")],
  outfile: join(dir, "page.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  legalComments: "none",
});
