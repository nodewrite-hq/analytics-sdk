import type { Payload, Where } from "payload";
import { AnalyticsEventKind } from "../core/event-kind.js";
import type { NewAnalyticsEvent, StoredAnalyticsEvent } from "../core/event.js";
import type { AnalyticsEventStore } from "../core/event-store.js";
import type { AnalyticsModules } from "../core/options.js";
import type { AnalyticsSummary, AnalyticsSummaryQuery } from "../core/summary.js";
import { acceptDurationSeconds } from "../core/duration-seconds.js";
import { summarizeAnalyticsEvents } from "../core/summarize-events.js";
import { ANALYTICS_EVENTS_SLUG } from "./collection.js";

/**
 * AnalyticsEventStore on Payload's Local API.
 * Rows in the requested range are grouped by summarizeAnalyticsEvents.
 */
export class PayloadAnalyticsEventStore implements AnalyticsEventStore {
  constructor(
    private readonly payload: Payload,
    private readonly modules: AnalyticsModules,
  ) {}

  async insertAnalyticsEvent(
    event: NewAnalyticsEvent,
    occurredAt: string,
  ): Promise<StoredAnalyticsEvent> {
    const data = {
      kind: event.kind,
      path: event.path,
      locale: event.locale,
      occurredAt,
      durationSeconds: event.durationSeconds,
      country: this.modules.country ? event.country : null,
      city: this.modules.city ? event.city : null,
      sessionId: this.modules.sessions ? event.sessionId : null,
      eventName: this.modules.clicks ? event.eventName : null,
    };
    const doc: unknown = await this.payload.create({
      collection: ANALYTICS_EVENTS_SLUG,
      data,
      overrideAccess: true,
    });
    const stored = mapDoc(doc, occurredAt);
    if (!stored) throw new Error("analytics-events create did not return a row");
    return stored;
  }

  async recordAnalyticsDuration(id: string, durationSeconds: number): Promise<void> {
    const accepted = acceptDurationSeconds(durationSeconds);
    if (accepted === null) return;
    await this.payload.update({
      collection: ANALYTICS_EVENTS_SLUG,
      where: {
        and: [{ id: { equals: id } }, { kind: { equals: AnalyticsEventKind.VIEW } }],
      },
      data: { durationSeconds: accepted },
      overrideAccess: true,
    });
  }

  async summarizeAnalytics(
    query: AnalyticsSummaryQuery,
    modules: AnalyticsModules,
  ): Promise<AnalyticsSummary> {
    const result = await this.payload.find({
      collection: ANALYTICS_EVENTS_SLUG,
      where: summaryWhere(query),
      pagination: false,
      depth: 0,
      overrideAccess: true,
    });
    const rows: StoredAnalyticsEvent[] = [];
    for (const doc of result.docs) {
      const mapped = mapDoc(doc);
      if (mapped) rows.push(mapped);
    }
    return summarizeAnalyticsEvents(rows, query, modules);
  }
}

function summaryWhere(query: AnalyticsSummaryQuery): Where {
  const and: Where[] = [
    { occurredAt: { greater_than_equal: query.from } },
    { occurredAt: { less_than_equal: query.to } },
  ];
  if (query.country !== null) and.push({ country: { equals: query.country } });
  if (query.path !== null) and.push({ path: { equals: query.path } });
  if (query.sessionId !== null) and.push({ sessionId: { equals: query.sessionId } });
  return { and };
}

function mapDoc(doc: unknown, occurredAtFallback?: string): StoredAnalyticsEvent | null {
  if (!isRecord(doc)) return null;
  const kind = doc.kind;
  const path = doc.path;
  if (!isId(doc.id) || (kind !== AnalyticsEventKind.VIEW && kind !== AnalyticsEventKind.CLICK)) {
    return null;
  }
  if (typeof path !== "string") return null;
  const occurredAt = timeText(doc.occurredAt) ?? occurredAtFallback ?? null;
  if (occurredAt === null) return null;
  return {
    id: String(doc.id),
    kind,
    path,
    locale: textOrNull(doc.locale),
    occurredAt,
    durationSeconds: numberOrNull(doc.durationSeconds),
    country: textOrNull(doc.country),
    city: textOrNull(doc.city),
    sessionId: textOrNull(doc.sessionId),
    eventName: textOrNull(doc.eventName),
  };
}

function isId(value: unknown): value is number | string {
  return typeof value === "string" || typeof value === "number";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function timeText(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value !== "string" || value.length === 0) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}
