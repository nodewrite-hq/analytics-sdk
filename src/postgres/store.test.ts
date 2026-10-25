import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AnalyticsEventKind } from "../core/event-kind.js";
import type { AnalyticsModules } from "../core/options.js";
import { analyticsEventSchemaSql, applyAnalyticsSchema } from "./schema.js";
import { PostgresAnalyticsEventStore } from "./store.js";

const modulesOn: AnalyticsModules = {
  country: true,
  city: true,
  sessions: true,
  clicks: true,
};

const databaseUrl = process.env.DATABASE_URL;

describe("analytics schema", () => {
  it("exports the analytics_event CREATE TABLE", () => {
    expect(analyticsEventSchemaSql).toMatch(/create table if not exists analytics_event/i);
    for (const column of [
      "id uuid primary key",
      "kind text not null",
      "path text not null",
      "locale text",
      "occurred_at timestamptz not null",
      "duration_seconds integer",
      "country text",
      "city text",
      "session_id text",
      "event_name text",
    ]) {
      expect(analyticsEventSchemaSql.toLowerCase()).toContain(column);
    }
    expect(typeof applyAnalyticsSchema).toBe("function");
  });
});

describe.skipIf(!databaseUrl)("PostgresAnalyticsEventStore", () => {
  let pool: pg.Pool | undefined;
  const path = `/pg-${randomUUID()}`;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: databaseUrl });
    await applyAnalyticsSchema(pool);
  });

  afterAll(async () => {
    if (!pool) return;
    await pool.query("delete from analytics_event where path = $1", [path]);
    await pool.end();
  });

  it("inserts a view and includes it in the summary", async () => {
    if (!pool) throw new Error("postgres pool was not opened");
    const store = new PostgresAnalyticsEventStore(pool, modulesOn);
    const occurredAt = "2026-10-25T12:00:00.000Z";

    const stored = await store.insertAnalyticsEvent(
      {
        kind: AnalyticsEventKind.VIEW,
        path,
        locale: "en",
        durationSeconds: null,
        country: "DE",
        city: "Berlin",
        sessionId: null,
        eventName: null,
      },
      occurredAt,
    );

    const summary = await store.summarizeAnalytics(
      {
        from: "2026-10-25T00:00:00.000Z",
        to: "2026-10-25T23:59:59.999Z",
        country: null,
        path,
        sessionId: null,
      },
      modulesOn,
    );

    expect(stored.id).toEqual(expect.any(String));
    expect(stored.path).toBe(path);
    expect(summary.totalViews).toBe(1);
    expect(summary.byPath).toEqual([{ path, views: 1, averageDurationSeconds: 0 }]);
    expect(summary.byCountry).toEqual([{ country: "DE", views: 1 }]);
  });
});
