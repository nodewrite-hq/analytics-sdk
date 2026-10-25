import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MemoryAnalyticsEventStore } from "@nodewrite-labs/analytics-sdk";
import type { AnalyticsEventStore, AnalyticsModules, AnalyticsServerOptions } from "@nodewrite-labs/analytics-sdk";
import { applyAnalyticsSchema, PostgresAnalyticsEventStore } from "@nodewrite-labs/analytics-sdk/postgres";
import { recordAnalyticsEvent } from "@nodewrite-labs/analytics-sdk/server";

const port = playgroundPort(process.env.PLAYGROUND_PORT);
const root = dirname(fileURLToPath(import.meta.url));
const maxBodyBytes = 65_536;

const modules: AnalyticsModules = {
  country: true,
  city: true,
  sessions: true,
  clicks: true,
};
const options: AnalyticsServerOptions = { enabled: true, modules };

interface PgPool {
  query: (sql: string) => Promise<unknown>;
  end: () => Promise<void>;
}

interface PgPoolConstructor {
  new (config: { connectionString: string }): PgPool;
}

const store = await openStore();

const server = createServer((req, res) => {
  void handle(req, res);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`playground port ${port} is already in use`);
    process.exit(1);
  }
  throw error;
});

server.listen(port, "127.0.0.1", () => {
  console.log(`playground http://localhost:${port}`);
});

function playgroundPort(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return 4317;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) return 4317;
  return parsed;
}

async function openStore(): Promise<AnalyticsEventStore> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("playground store: memory");
    return new MemoryAnalyticsEventStore(modules);
  }

  const Pool = await loadPool();
  const pool = new Pool({ connectionString: databaseUrl });
  await applyAnalyticsSchema(pool as never);
  console.log("playground store: postgres");
  return new PostgresAnalyticsEventStore(pool as never, modules);
}

async function loadPool(): Promise<PgPoolConstructor> {
  const loaded = (await import("pg")) as {
    Pool?: PgPoolConstructor;
    default?: { Pool?: PgPoolConstructor };
  };
  const Pool = loaded.Pool ?? loaded.default?.Pool;
  if (!Pool) throw new Error("pg Pool export was not found");
  return Pool;
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const path = routeOf(req.url);
    if (req.method === "GET" && path === "/") {
      sendFile(res, "index.html", "text/html; charset=utf-8");
      return;
    }
    if (req.method === "GET" && path === "/page.js") {
      sendFile(res, "page.js", "text/javascript; charset=utf-8");
      return;
    }
    if (req.method === "POST" && path === "/analytics/events") {
      await postEvent(req, res);
      return;
    }
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (error) {
    console.error("playground request failed", error instanceof Error ? error.name : "Error");
    if (res.headersSent) return;
    res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "failed" }));
  }
}

async function postEvent(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJson(req);
  if (!body.ok) {
    res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
    res.end("null");
    return;
  }

  const result = await recordAnalyticsEvent(
    { body: body.value, headers: headersOf(req) },
    { store, options },
  );
  const id = result.body?.id ?? "";
  console.log(`POST /analytics/events ${result.status} ${id}`.trim());

  if (result.status === 204) {
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(result.status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(result.body));
}

function sendFile(res: ServerResponse, name: string, contentType: string): void {
  const file = readFileSync(join(root, name));
  res.writeHead(200, {
    "content-type": contentType,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(file);
}

function routeOf(url: string | undefined): string {
  if (!url) return "/";
  const query = url.indexOf("?");
  return query === -1 ? url : url.slice(0, query);
}

function headersOf(req: IncomingMessage): Record<string, string | string[] | undefined> {
  const headers: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string" || Array.isArray(value)) headers[key] = value;
  }
  return headers;
}

function readJson(
  req: IncomingMessage,
): Promise<{ ok: true; value: unknown } | { ok: false }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > maxBodyBytes) {
        resolve({ ok: false });
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (raw.length === 0) {
        resolve({ ok: false });
        return;
      }
      try {
        resolve({ ok: true, value: JSON.parse(raw) as unknown });
      } catch {
        resolve({ ok: false });
      }
    });
    req.on("error", reject);
  });
}
