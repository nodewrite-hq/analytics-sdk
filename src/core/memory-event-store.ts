import { randomUUID } from "node:crypto";
import { AnalyticsEventKind } from "./event-kind.js";
import type { NewAnalyticsEvent, StoredAnalyticsEvent } from "./event.js";
import type { AnalyticsEventStore } from "./event-store.js";
import type { AnalyticsModules } from "./options.js";
import type { AnalyticsSummary, AnalyticsSummaryQuery } from "./summary.js";
import { acceptDurationSeconds } from "./duration-seconds.js";
import { summarizeAnalyticsEvents } from "./summarize-events.js";

export class MemoryAnalyticsEventStore implements AnalyticsEventStore {
  private readonly rows: StoredAnalyticsEvent[] = [];

  constructor(private readonly modules: AnalyticsModules) {}

  async insertAnalyticsEvent(
    event: NewAnalyticsEvent,
    occurredAt: string,
  ): Promise<StoredAnalyticsEvent> {
    const stored: StoredAnalyticsEvent = {
      kind: event.kind,
      path: event.path,
      locale: event.locale,
      durationSeconds: event.durationSeconds,
      country: this.modules.country ? event.country : null,
      city: this.modules.city ? event.city : null,
      sessionId: this.modules.sessions ? event.sessionId : null,
      eventName: this.modules.clicks ? event.eventName : null,
      id: randomUUID(),
      occurredAt,
    };
    this.rows.push(stored);
    return stored;
  }

  async recordAnalyticsDuration(id: string, durationSeconds: number): Promise<void> {
    const row = this.rows.find((candidate) => candidate.id === id);
    if (!row || row.kind !== AnalyticsEventKind.VIEW) return;
    const accepted = acceptDurationSeconds(durationSeconds);
    if (accepted === null) return;
    row.durationSeconds = accepted;
  }

  async summarizeAnalytics(
    query: AnalyticsSummaryQuery,
    modules: AnalyticsModules,
  ): Promise<AnalyticsSummary> {
    return summarizeAnalyticsEvents(this.rows, query, modules);
  }
}
