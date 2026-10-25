import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcDir = fileURLToPath(new URL("../src/", import.meta.url));

/** Entry trees scanned for a payload import. `src/payload` is the only excluded tree. */
const SCANNED_TREES = ["core", "client", "server", "postgres"] as const;

const PAYLOAD_IMPORTS = ["from 'payload'", 'from "payload"'] as const;

function importsPayload(source: string): boolean {
  return PAYLOAD_IMPORTS.some((specifier) => source.includes(specifier));
}

function childDirectories(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function walkFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

/** `src/index.ts` plus every file under core, client, server, and postgres. */
function scannedFiles(root: string): string[] {
  const files = [join(root, "index.ts")];
  for (const tree of SCANNED_TREES) {
    files.push(...walkFiles(join(root, tree)));
  }
  return files;
}

function toPosix(path: string): string {
  return path.replaceAll("\\", "/");
}

describe("payload import boundary", () => {
  it("does not import payload from the core, client, server, or postgres source", () => {
    const offenders = scannedFiles(srcDir)
      .filter((file) => importsPayload(readFileSync(file, "utf8")))
      .map((file) => toPosix(relative(srcDir, file)));

    expect(offenders).toEqual([]);
  });

  it("fails a scanned file that imports payload and allows that import under src/payload", () => {
    const samples = [
      { path: "index.ts", source: "export { x } from 'payload'\n" },
      { path: "client/index.ts", source: 'export { x } from "payload"\n' },
      { path: "server/index.ts", source: "export {}\n" },
      { path: "postgres/index.ts", source: "export {}\n" },
      { path: "payload/index.ts", source: "export { x } from 'payload'\n" },
    ];

    const offenders = samples
      .filter((file) => !file.path.startsWith("payload/") && importsPayload(file.source))
      .map((file) => file.path);

    expect(offenders).toEqual(["index.ts", "client/index.ts"]);
    expect(samples.some((file) => file.path.startsWith("payload/") && importsPayload(file.source))).toBe(
      true,
    );
  });

  it("excludes only the src/payload tree from the scan", () => {
    const scanned = new Set<string>(SCANNED_TREES);
    const excluded = childDirectories(srcDir).filter((name) => !scanned.has(name));

    expect(excluded).toEqual(["payload"]);

    const paths = scannedFiles(srcDir).map((file) => toPosix(relative(srcDir, file)));
    expect(paths).toContain("index.ts");
    expect(paths.some((file) => file.startsWith("payload/"))).toBe(false);
  });
});
