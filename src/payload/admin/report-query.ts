import { type AnalyticsPeriod, DEFAULT_ANALYTICS_PERIOD, isAnalyticsPeriod } from "../../core/period.js";
import type { AnalyticsModules } from "../../core/options.js";

/** The report's state, kept in the URL so a filtered report can be shared and reloaded. */
export interface AnalyticsReportQuery {
  period: AnalyticsPeriod;
  country: string | null;
  path: string | null;
  session: string | null;
  showAllPages: boolean;
}

export const ReportParam = {
  PERIOD: "period",
  COUNTRY: "country",
  PATH: "path",
  SESSION: "session",
  PAGES: "pages",
} as const;

export type ReportParam = (typeof ReportParam)[keyof typeof ReportParam];

const ALL_PAGES = "all";
const COUNTRY_CODE = /^[A-Z]{2}$/;
const PATH_MAX = 2048;

type SearchParams = Record<string, string | string[] | undefined> | undefined;

export function parseReportQuery(searchParams: SearchParams, modules: AnalyticsModules): AnalyticsReportQuery {
  const period = firstParam(searchParams, ReportParam.PERIOD);
  const country = firstParam(searchParams, ReportParam.COUNTRY)?.toUpperCase() ?? null;
  const path = firstParam(searchParams, ReportParam.PATH);
  return {
    period: isAnalyticsPeriod(period) ? period : DEFAULT_ANALYTICS_PERIOD,
    country: modules.country && country !== null && COUNTRY_CODE.test(country) ? country : null,
    path: path !== null && path.startsWith("/") && path.length <= PATH_MAX ? path : null,
    session: modules.sessions ? firstParam(searchParams, ReportParam.SESSION) : null,
    showAllPages: firstParam(searchParams, ReportParam.PAGES) === ALL_PAGES,
  };
}

/** The report URL for `query` with `changes` applied; a null change removes that filter. */
export function reportHref(
  viewHref: string,
  query: AnalyticsReportQuery,
  changes: Partial<AnalyticsReportQuery> = {},
): string {
  const next = { ...query, ...changes };
  const params = new URLSearchParams();
  if (next.period !== DEFAULT_ANALYTICS_PERIOD) params.set(ReportParam.PERIOD, next.period);
  if (next.country) params.set(ReportParam.COUNTRY, next.country);
  if (next.path) params.set(ReportParam.PATH, next.path);
  if (next.session) params.set(ReportParam.SESSION, next.session);
  if (next.showAllPages) params.set(ReportParam.PAGES, ALL_PAGES);
  const search = params.toString();
  return search.length === 0 ? viewHref : `${viewHref}?${search}`;
}

function firstParam(searchParams: SearchParams, name: ReportParam): string | null {
  const value = searchParams?.[name];
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first !== "string") return null;
  const trimmed = first.trim();
  return trimmed.length === 0 ? null : trimmed;
}
