import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { AnalyticsEventKind } from "../core/event-kind.js";
import type { NewAnalyticsEvent, StoredAnalyticsEvent } from "../core/event.js";
import type { AnalyticsEventStore } from "../core/event-store.js";
import type { AnalyticsModules } from "../core/options.js";
import type { AnalyticsSummary, AnalyticsSummaryQuery } from "../core/summary.js";
import { acceptDurationSeconds } from "../core/duration-seconds.js";
import { summarizeAnalyticsEvents } from "../core/summarize-events.js";

interface AnalyticsEventRow {
  id: string;
  kind: string;
  path: string;
  locale: string | null;
  occurred_at: Date | string;
  duration_seconds: number | string | null;
  country: string | null;
  city: string | null;
  session_id: string | null;
  event_name: string | null;
}

const INSERT_EVENT = `
  insert into analytics_event (
    id,
    kind,
    path,
    locale,
    occurred_at,
    duration_seconds,
    country,
    city,
    session_id,
    event_name
  ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  returning
    id,
    kind,
    path,
    locale,
    occurred_at,
    duration_seconds,
    country,
    city,
    session_id,
    event_name
`;

const SELECT_IN_RANGE = `
  select
    id,
    kind,
    path,
    locale,
    occurred_at,
    duration_seconds,
    country,
    city,
    session_id,
    event_name
  from analytics_event
  where occurred_at >= $1 and occurred_at <= $2
`;

export class PostgresAnalyticsEventStore implements AnalyticsEventStore {
  constructor(
    private readonly pool: Pool,
    private readonly modules: AnalyticsModules,
  ) {}

  async insertAnalyticsEvent(
    event: NewAnalyticsEvent,
    occurredAt: string,
  ): Promise<StoredAnalyticsEvent> {
    const id = randomUUID();
    const result = await this.pool.query<AnalyticsEventRow>(INSERT_EVENT, [
      id,
      event.kind,
      event.path,
      event.locale,
      occurredAt,
      durationColumn(event.durationSeconds),
      this.modules.country ? event.country : null,
      this.modules.city ? event.city : null,
      this.modules.sessions ? event.sessionId : null,
      this.modules.clicks ? event.eventName : null,
    ]);
    return requiredRow(result.rows[0]);
  }

  async recordAnalyticsDuration(id: string, durationSeconds: number): Promise<void> {
    const accepted = acceptDurationSeconds(durationSeconds);
    if (accepted === null) return;
    await this.pool.query(
      "update analytics_event set duration_seconds = $1 where id = $2 and kind = $3",
      [Math.round(accepted), id, AnalyticsEventKind.VIEW],
    );
  }

  async summarizeAnalytics(
    query: AnalyticsSummaryQuery,
    modules: AnalyticsModules,
  ): Promise<AnalyticsSummary> {
    const result = await this.pool.query<AnalyticsEventRow>(SELECT_IN_RANGE, [query.from, query.to]);
    const rows: StoredAnalyticsEvent[] = [];
    for (const row of result.rows) {
      const mapped = mapRow(row);
      if (mapped) rows.push(mapped);
    }
    return summarizeAnalyticsEvents(rows, query, modules);
  }
}

function durationColumn(value: number | null): number | null {
  if (value === null) return null;
  const accepted = acceptDurationSeconds(value);
  if (accepted === null) return null;
  return Math.round(accepted);
}

function requiredRow(row: AnalyticsEventRow | undefined): StoredAnalyticsEvent {
  const mapped = row ? mapRow(row) : null;
  if (!mapped) throw new Error("analytics_event insert did not return a row");
  return mapped;
}

function mapRow(row: AnalyticsEventRow): StoredAnalyticsEvent | null {
  if (row.kind !== AnalyticsEventKind.VIEW && row.kind !== AnalyticsEventKind.CLICK) return null;
  return {
    id: String(row.id),
    kind: row.kind,
    path: row.path,
    locale: row.locale,
    occurredAt: toIso(row.occurred_at),
    durationSeconds: durationFromColumn(row.duration_seconds),
    country: row.country,
    city: row.city,
    sessionId: row.session_id,
    eventName: row.event_name,
  };
}

function durationFromColumn(value: number | string | null): number | null {
  if (value === null) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
}

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
