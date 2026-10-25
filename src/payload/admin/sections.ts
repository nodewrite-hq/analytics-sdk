import type { AnalyticsModules } from "../../core/options.js";
import type { AnalyticsSummary } from "../../core/summary.js";

export interface AdminSectionsQuery {
  session?: string | null;
}

export type AdminSection =
  | {
      kind: "totals";
      totalViews: number;
      averageDurationSeconds: number;
    }
  | {
      kind: "paths";
      rows: AnalyticsSummary["byPath"];
    }
  | {
      kind: "countries";
      rows: NonNullable<AnalyticsSummary["byCountry"]>;
    }
  | {
      kind: "cities";
      rows: NonNullable<AnalyticsSummary["byCity"]>;
    }
  | {
      kind: "namedClicks";
      rows: NonNullable<AnalyticsSummary["byEventName"]>;
    }
  | {
      kind: "sessions";
      rows: NonNullable<AnalyticsSummary["sessions"]>;
    }
  | {
      kind: "trail";
      events: NonNullable<AnalyticsSummary["events"]>;
    };

/**
 * Blocks for the admin screen, in display order.
 * A module that is off contributes no block.
 * A session query replaces the session list with one trail of that session's events, in time order.
 */
export function adminSections(
  summary: AnalyticsSummary,
  modules: AnalyticsModules,
  query: AdminSectionsQuery,
): AdminSection[] {
  const blocks: AdminSection[] = [
    {
      kind: "totals",
      totalViews: summary.totalViews,
      averageDurationSeconds: summary.averageDurationSeconds,
    },
    { kind: "paths", rows: summary.byPath },
  ];

  if (modules.country) blocks.push({ kind: "countries", rows: summary.byCountry ?? [] });
  if (modules.city) blocks.push({ kind: "cities", rows: summary.byCity ?? [] });
  if (modules.clicks) blocks.push({ kind: "namedClicks", rows: summary.byEventName ?? [] });
  if (modules.sessions) {
    if (sessionText(query.session)) {
      blocks.push({ kind: "trail", events: orderedEvents(summary.events ?? []) });
    } else {
      blocks.push({ kind: "sessions", rows: summary.sessions ?? [] });
    }
  }

  return blocks;
}

function sessionText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function orderedEvents(
  events: NonNullable<AnalyticsSummary["events"]>,
): NonNullable<AnalyticsSummary["events"]> {
  return events.slice().sort((left, right) => {
    if (left.occurredAt < right.occurredAt) return -1;
    if (left.occurredAt > right.occurredAt) return 1;
    if (left.id < right.id) return -1;
    if (left.id > right.id) return 1;
    return 0;
  });
}
