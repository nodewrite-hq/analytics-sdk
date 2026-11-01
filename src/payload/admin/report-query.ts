import { type AnalyticsPeriod, DEFAULT_ANALYTICS_PERIOD, isAnalyticsPeriod } from "../../core/period.js";
import type { AnalyticsModules } from "../../core/options.js";

/** The report's state, kept in the URL so a filtered report can be shared and reloaded. */
export interface AnalyticsReportQuery {
  period: AnalyticsPeriod;
  country: string | null;
  path: string | null;
  session: string | null;
  showAllPages: boolean;
  /** Narrows the page list to one section, such as `/news`. */
  section: string | null;
  /** Narrows the page list to paths containing this text. */
  pageSearch: string | null;
  /** The page of the full page list, from 1. */
  pageListPage: number;
}

export const ReportParam = {
  PERIOD: "period",
  COUNTRY: "country",
  PATH: "path",
  SESSION: "session",
  PAGES: "pages",
  SECTION: "section",
  PAGE_SEARCH: "q",
  PAGE_LIST_PAGE: "page",
} as const;

export type ReportParam = (typeof ReportParam)[keyof typeof ReportParam];

const ALL_PAGES = "all";
const COUNTRY_CODE = /^[A-Z]{2}$/;
const PATH_MAX = 2048;
const SEARCH_MAX = 200;
export const FIRST_PAGE_LIST_PAGE = 1;

type SearchParams = Record<string, string | string[] | undefined> | undefined;

export function parseReportQuery(searchParams: SearchParams, modules: AnalyticsModules): AnalyticsReportQuery {
  const period = firstParam(searchParams, ReportParam.PERIOD);
  const country = firstParam(searchParams, ReportParam.COUNTRY)?.toUpperCase() ?? null;
  const path = firstParam(searchParams, ReportParam.PATH);
  const section = firstParam(searchParams, ReportParam.SECTION);
  const pageSearch = firstParam(searchParams, ReportParam.PAGE_SEARCH);
  return {
    period: isAnalyticsPeriod(period) ? period : DEFAULT_ANALYTICS_PERIOD,
    country: modules.country && country !== null && COUNTRY_CODE.test(country) ? country : null,
    path: isPath(path) ? path : null,
    session: modules.sessions ? firstParam(searchParams, ReportParam.SESSION) : null,
    showAllPages: firstParam(searchParams, ReportParam.PAGES) === ALL_PAGES,
    section: isPath(section) ? section : null,
    pageSearch: pageSearch !== null && pageSearch.length <= SEARCH_MAX ? pageSearch : null,
    pageListPage: pageNumber(firstParam(searchParams, ReportParam.PAGE_LIST_PAGE)),
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
  if (next.section) params.set(ReportParam.SECTION, next.section);
  if (next.pageSearch) params.set(ReportParam.PAGE_SEARCH, next.pageSearch);
  if (next.pageListPage > FIRST_PAGE_LIST_PAGE) {
    params.set(ReportParam.PAGE_LIST_PAGE, String(next.pageListPage));
  }
  const search = params.toString();
  return search.length === 0 ? viewHref : `${viewHref}?${search}`;
}

function isPath(value: string | null): value is string {
  return value !== null && value.startsWith("/") && value.length <= PATH_MAX;
}

function pageNumber(value: string | null): number {
  const number = Number(value);
  return Number.isInteger(number) && number >= FIRST_PAGE_LIST_PAGE ? number : FIRST_PAGE_LIST_PAGE;
}

function firstParam(searchParams: SearchParams, name: ReportParam): string | null {
  const value = searchParams?.[name];
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first !== "string") return null;
  const trimmed = first.trim();
  return trimmed.length === 0 ? null : trimmed;
}
