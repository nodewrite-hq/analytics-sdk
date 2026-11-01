import type { AnalyticsModules } from "../../core/options.js";
import type { AnalyticsSummary } from "../../core/summary.js";
import { type PageListPosition, pageList, type SectionRow, summarizeSections } from "./page-list.js";
import type { AnalyticsReportQuery } from "./report-query.js";

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
  /** Null for the top pages; where the full, filtered list stands when it is shown. */
  pageList: PageListPosition | null;
  /** Views per section of the site (`/news`), most viewed first. */
  sections: (ReportRow & SectionRow)[];
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
  /** Locale path prefixes (`en`) that start a section of their own language. */
  localePrefixes?: readonly string[];
}

/**
 * Orders and trims the summary for the screen: most viewed first, the top pages unless the full
 * list is asked for, then one page of it, narrowed by section and search.
 */
export function buildAnalyticsReport({
  summary,
  periodSummary,
  modules,
  query,
  localePrefixes = [],
}: BuildAnalyticsReportInput): AnalyticsReport {
  const pages = withShares(byViews(summary.byPath, (row) => row.path));
  const list = pageList({
    pages,
    showAll: query.showAllPages,
    section: query.section,
    search: query.pageSearch,
    page: query.pageListPage,
    localePrefixes,
  });
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
    pages: list.rows,
    hasMorePages: list.hasMore,
    pageList: list.position,
    sections: withShares(summarizeSections(pages, localePrefixes)),
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
