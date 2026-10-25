import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";

const here = dirname(fileURLToPath(import.meta.url));

function readSchema(): string {
  const candidates = [join(here, "schema.sql"), join(here, "..", "..", "src", "postgres", "schema.sql")];
  for (const candidate of candidates) {
    try {
      return readFileSync(candidate, "utf8");
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }
  }
  throw new Error("analytics schema.sql was not found");
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export const analyticsEventSchemaSql = readSchema();

export async function applyAnalyticsSchema(pool: Pool): Promise<void> {
  await pool.query(analyticsEventSchemaSql);
}
