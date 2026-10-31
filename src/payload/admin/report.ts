import type { AnalyticsModules } from "../../core/options.js";
import type { AnalyticsSummary } from "../../core/summary.js";
import type { AnalyticsReportQuery } from "./report-query.js";

export const TOP_PAGES_COUNT = 5;

export interface ReportRow {
  views: number;
  /** This row's part of the largest row, from 0 to 1, for the bar behind it. */
  share: number;
}

export interface AnalyticsReport {
  totals: {
    views: number;
    averageDurationSeconds: number;
    /** Null when the clicks module is off. */
    clicks: number | null;
  };
  viewsOverTime: { start: string; views: number }[];
  pages: (ReportRow & { path: string; averageDurationSeconds: number })[];
  hasMorePages: boolean;
  /** Null when the country module is off. */
  countries: (ReportRow & { country: string })[] | null;
  /** Countries with views in the period, whatever the country filter, most views first. */
  countryOptions: string[];
  cities: (ReportRow & { city: string })[] | null;
  clicks: { eventName: string; count: number }[] | null;
  sessions: NonNullable<AnalyticsSummary["sessions"]> | null;
  trail: NonNullable<AnalyticsSummary["events"]> | null;
}

export interface BuildAnalyticsReportInput {
  summary: AnalyticsSummary;
  /** The same period without the country filter; it lists the countries to choose from. */
  periodSummary: AnalyticsSummary;
  modules: AnalyticsModules;
  query: AnalyticsReportQuery;
}

/** Orders and trims the summary for the screen: most viewed first, top pages unless all are asked for. */
export function buildAnalyticsReport({
  summary,
  periodSummary,
  modules,
  query,
}: BuildAnalyticsReportInput): AnalyticsReport {
  const pages = withShares(byViews(summary.byPath, (row) => row.path));
  const clicks = modules.clicks
    ? [...(summary.byEventName ?? [])].sort(
        (left, right) => right.count - left.count || compare(left.eventName, right.eventName),
      )
    : null;

  return {
    totals: {
      views: summary.totalViews,
      averageDurationSeconds: summary.averageDurationSeconds,
      clicks: clicks ? clicks.reduce((total, row) => total + row.count, 0) : null,
    },
    viewsOverTime: summary.viewsOverTime ?? [],
    pages: query.showAllPages ? pages : pages.slice(0, TOP_PAGES_COUNT),
    hasMorePages: pages.length > TOP_PAGES_COUNT,
    countries: modules.country ? withShares(byViews(summary.byCountry ?? [], (row) => row.country)) : null,
    countryOptions: modules.country
      ? byViews(periodSummary.byCountry ?? [], (row) => row.country).map((row) => row.country)
      : [],
    cities: modules.city ? withShares(byViews(summary.byCity ?? [], (row) => row.city)) : null,
    clicks,
    sessions: modules.sessions && query.session === null ? (summary.sessions ?? []) : null,
    trail: modules.sessions && query.session !== null ? (summary.events ?? []) : null,
  };
}

function byViews<Row extends { views: number }>(rows: readonly Row[], name: (row: Row) => string): Row[] {
  return [...rows].sort((left, right) => right.views - left.views || compare(name(left), name(right)));
}

function withShares<Row extends { views: number }>(rows: readonly Row[]): (Row & { share: number })[] {
  const most = rows[0]?.views ?? 0;
  return rows.map((row) => ({ ...row, share: most === 0 ? 0 : row.views / most }));
}

function compare(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
