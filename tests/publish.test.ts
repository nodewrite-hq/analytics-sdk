import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("README", () => {
  it("explains the package entries and the record path", () => {
    const readme = readFileSync(join(packageRoot, "README.md"), "utf8");
    const headings = readme
      .split(/\r?\n/)
      .filter((line) => /^#{1,6}\s+\S/.test(line))
      .map((line) => line.replace(/^#{1,6}\s+/, "").trim().toLowerCase());

    for (const title of ["entries", "events", "modules", "browser", "server", "store"]) {
      expect(
        headings.some((heading) => heading.includes(title)),
        `missing heading: ${title}`,
      ).toBe(true);
    }

    expect(readme).toContain("startAnalytics");
    expect(readme).toContain("recordAnalyticsEvent");
    expect(readme).toContain("schema.sql");
    expect(readme).toContain("@nodewrite-labs/analytics-sdk/client");
    expect(readme).toContain("@nodewrite-labs/analytics-sdk/server");
    expect(readme).toContain("@nodewrite-labs/analytics-sdk/postgres");
  });
});

describe("pack", () => {
  it("does not list playground", () => {
    if (!existsSync(join(packageRoot, "dist", "index.js"))) {
      const build = runPnpm(["build"]);
      expect(build.status, build.output).toBe(0);
    }

    const packed = runPnpm(["pack", "--dry-run"]);
    expect(packed.status, packed.output).toBe(0);

    const files = tarballFiles(packed.output);
    expect(files.length).toBeGreaterThan(0);
    expect(files.filter((file) => isPlaygroundPath(file))).toEqual([]);
  }, 120_000);
});

function runPnpm(args: string[]): { status: number | null; output: string } {
  const result = spawnSync("pnpm", args, {
    cwd: packageRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
    windowsHide: true,
  });
  const errorText = result.error ? `\n${result.error.message}` : "";
  return {
    status: result.status,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}${errorText}`,
  };
}

function tarballFiles(output: string): string[] {
  const lines = output.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === "Tarball Contents");
  const end = lines.findIndex((line) => line.trim() === "Tarball Details");
  expect(start, output).toBeGreaterThanOrEqual(0);
  expect(end, output).toBeGreaterThan(start);
  return lines
    .slice(start + 1, end)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function isPlaygroundPath(file: string): boolean {
  return file.split(/[\\/]/).includes("playground");
}
