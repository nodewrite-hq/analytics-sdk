import { AnalyticsEventKind } from "./event-kind.js";
import type { StoredAnalyticsEvent } from "./event.js";
import type { AnalyticsModules } from "./options.js";
import type { AnalyticsBucket } from "./period.js";
import type { AnalyticsSummary, AnalyticsSummaryQuery } from "./summary.js";

export function summarizeAnalyticsEvents(
  rows: readonly StoredAnalyticsEvent[],
  query: AnalyticsSummaryQuery,
  modules: AnalyticsModules,
): AnalyticsSummary {
  const filtered = rows.filter((row) => inQuery(row, query));
  const views = filtered.filter((row) => row.kind === AnalyticsEventKind.VIEW);

  const summary: AnalyticsSummary = {
    totalViews: views.length,
    averageDurationSeconds: meanDuration(views),
    byPath: groupByPath(views),
  };

  if (query.buckets) {
    summary.viewsOverTime = countViewsByBucket(views, query.buckets);
  }

  if (modules.country) {
    summary.byCountry = groupByCountry(views);
  }
  if (modules.city) {
    summary.byCity = groupByCity(views);
  }
  if (modules.sessions) {
    summary.sessions = groupSessions(filtered);
    if (query.sessionId !== null) {
      summary.events = filtered
        .slice()
        .sort(byOccurredAt)
        .map((row) => ({
          id: row.id,
          kind: row.kind,
          path: row.path,
          occurredAt: row.occurredAt,
          eventName: row.eventName,
        }));
    }
  }
  if (modules.clicks) {
    summary.byEventName = groupByEventName(filtered);
  }

  return summary;
}

function inQuery(row: StoredAnalyticsEvent, query: AnalyticsSummaryQuery): boolean {
  if (row.occurredAt < query.from || row.occurredAt > query.to) return false;
  if (query.country !== null && row.country !== query.country) return false;
  if (query.path !== null && row.path !== query.path) return false;
  if (query.sessionId !== null && row.sessionId !== query.sessionId) return false;
  return true;
}

function meanDuration(views: readonly StoredAnalyticsEvent[]): number {
  let total = 0;
  let count = 0;
  for (const view of views) {
    if (view.durationSeconds === null) continue;
    total += view.durationSeconds;
    count += 1;
  }
  if (count === 0) return 0;
  return total / count;
}

function countViewsByBucket(
  views: readonly StoredAnalyticsEvent[],
  buckets: readonly AnalyticsBucket[],
): NonNullable<AnalyticsSummary["viewsOverTime"]> {
  const counts = buckets.map(() => 0);
  const ends = buckets.map((bucket) => Date.parse(bucket.end));
  const starts = buckets.map((bucket) => Date.parse(bucket.start));
  for (const view of views) {
    const at = Date.parse(view.occurredAt);
    const index = starts.findIndex((start, position) => at >= start && at < (ends[position] ?? start));
    if (index >= 0) counts[index] = (counts[index] ?? 0) + 1;
  }
  return buckets.map((bucket, index) => ({ start: bucket.start, views: counts[index] ?? 0 }));
}

function groupByPath(views: readonly StoredAnalyticsEvent[]): AnalyticsSummary["byPath"] {
  const groups = new Map<string, StoredAnalyticsEvent[]>();
  for (const view of views) {
    const existing = groups.get(view.path);
    if (existing) existing.push(view);
    else groups.set(view.path, [view]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => compareString(left, right))
    .map(([path, pathViews]) => ({
      path,
      views: pathViews.length,
      averageDurationSeconds: meanDuration(pathViews),
    }));
}

function groupByCountry(views: readonly StoredAnalyticsEvent[]): NonNullable<AnalyticsSummary["byCountry"]> {
  const counts = new Map<string, number>();
  for (const view of views) {
    if (view.country === null) continue;
    counts.set(view.country, (counts.get(view.country) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([country, viewCount]) => ({ country, views: viewCount }))
    .sort((left, right) => compareString(left.country, right.country));
}

function groupByCity(views: readonly StoredAnalyticsEvent[]): NonNullable<AnalyticsSummary["byCity"]> {
  const counts = new Map<string, number>();
  for (const view of views) {
    if (view.city === null) continue;
    counts.set(view.city, (counts.get(view.city) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([city, viewCount]) => ({ city, views: viewCount }))
    .sort((left, right) => compareString(left.city, right.city));
}

function groupSessions(rows: readonly StoredAnalyticsEvent[]): NonNullable<AnalyticsSummary["sessions"]> {
  const groups = new Map<string, { startedAt: string; pageCount: number }>();
  for (const row of rows) {
    if (row.sessionId === null) continue;
    const existing = groups.get(row.sessionId);
    if (!existing) {
      groups.set(row.sessionId, {
        startedAt: row.occurredAt,
        pageCount: row.kind === AnalyticsEventKind.VIEW ? 1 : 0,
      });
      continue;
    }
    if (row.occurredAt < existing.startedAt) existing.startedAt = row.occurredAt;
    if (row.kind === AnalyticsEventKind.VIEW) existing.pageCount += 1;
  }

  return [...groups.entries()]
    .map(([id, group]) => ({ id, startedAt: group.startedAt, pageCount: group.pageCount }))
    .sort(
      (left, right) =>
        compareString(left.startedAt, right.startedAt) || compareString(left.id, right.id),
    );
}

function groupByEventName(
  rows: readonly StoredAnalyticsEvent[],
): NonNullable<AnalyticsSummary["byEventName"]> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.kind !== AnalyticsEventKind.CLICK || row.eventName === null) continue;
    counts.set(row.eventName, (counts.get(row.eventName) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([eventName, count]) => ({ eventName, count }))
    .sort((left, right) => compareString(left.eventName, right.eventName));
}

function byOccurredAt(left: StoredAnalyticsEvent, right: StoredAnalyticsEvent): number {
  return compareString(left.occurredAt, right.occurredAt) || compareString(left.id, right.id);
}

function compareString(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
