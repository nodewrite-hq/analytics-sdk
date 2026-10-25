import type { NewAnalyticsEvent, StoredAnalyticsEvent } from "./event.js";
import type { AnalyticsModules } from "./options.js";
import type { AnalyticsSummary, AnalyticsSummaryQuery } from "./summary.js";

export interface AnalyticsEventStore {
  insertAnalyticsEvent(event: NewAnalyticsEvent, occurredAt: string): Promise<StoredAnalyticsEvent>;
  recordAnalyticsDuration(id: string, durationSeconds: number): Promise<void>;
  summarizeAnalytics(query: AnalyticsSummaryQuery, modules: AnalyticsModules): Promise<AnalyticsSummary>;
}
