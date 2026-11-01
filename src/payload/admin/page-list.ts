import { FIRST_PAGE_LIST_PAGE } from "./report-query.js";

export const TOP_PAGES_COUNT = 5;
export const PAGE_LIST_SIZE = 25;
/** The site root, as a section of its own. */
export const ROOT_SECTION = "/";

interface PathRow {
  path: string;
  views: number;
}

export interface SectionRow {
  section: string;
  views: number;
  pageCount: number;
}

/** Where the full list stands: which slice of how many matching pages is shown. */
export interface PageListPosition {
  page: number;
  pageCount: number;
  /** 1-based positions of the first and last row shown; 0 when nothing matches. */
  from: number;
  to: number;
  total: number;
}

export interface PageListInput<Row extends PathRow> {
  /** Every page, most viewed first. */
  pages: readonly Row[];
  showAll: boolean;
  section: string | null;
  search: string | null;
  page: number;
  localePrefixes: readonly string[];
}

export interface PageList<Row extends PathRow> {
  rows: Row[];
  hasMore: boolean;
  /** Null for the top pages; set when the full list is shown. */
  position: PageListPosition | null;
}

/**
 * The section a page belongs to: its first path segment (`/news/a` → `/news`), or the first two
 * after a locale prefix (`/en/news/a` → `/en/news`), so each language's sections stay apart.
 */
export function sectionOf(path: string, localePrefixes: readonly string[]): string {
  const [first, second] = path.split("/").filter((segment) => segment.length > 0);
  if (first === undefined) return ROOT_SECTION;
  if (second !== undefined && localePrefixes.includes(first)) return `/${first}/${second}`;
  return `/${first}`;
}

export function isInSection(path: string, section: string, localePrefixes: readonly string[]): boolean {
  return sectionOf(path, localePrefixes) === section;
}

/** Views per section, most viewed first. */
export function summarizeSections(pages: readonly PathRow[], localePrefixes: readonly string[]): SectionRow[] {
  const sections = new Map<string, SectionRow>();
  for (const page of pages) {
    const section = sectionOf(page.path, localePrefixes);
    const row = sections.get(section) ?? { section, views: 0, pageCount: 0 };
    row.views += page.views;
    row.pageCount += 1;
    sections.set(section, row);
  }
  return [...sections.values()].sort(
    (left, right) => right.views - left.views || left.section.localeCompare(right.section),
  );
}

/** The top pages, or one page of the full list narrowed by section and search. */
export function pageList<Row extends PathRow>(input: PageListInput<Row>): PageList<Row> {
  const hasMore = input.pages.length > TOP_PAGES_COUNT;
  if (!input.showAll) {
    return { rows: input.pages.slice(0, TOP_PAGES_COUNT), hasMore, position: null };
  }

  const matching = input.pages.filter(
    (page) =>
      (input.section === null || isInSection(page.path, input.section, input.localePrefixes)) &&
      (input.search === null || page.path.toLowerCase().includes(input.search.toLowerCase())),
  );
  const pageCount = Math.max(FIRST_PAGE_LIST_PAGE, Math.ceil(matching.length / PAGE_LIST_SIZE));
  const page = Math.min(input.page, pageCount);
  const start = (page - 1) * PAGE_LIST_SIZE;
  const rows = matching.slice(start, start + PAGE_LIST_SIZE);
  return {
    rows,
    hasMore,
    position: {
      page,
      pageCount,
      from: rows.length === 0 ? 0 : start + 1,
      to: start + rows.length,
      total: matching.length,
    },
  };
}
