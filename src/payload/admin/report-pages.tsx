import type { ReactNode } from "react";
import type { PageListPosition } from "./page-list.js";
import type { AnalyticsReportQuery } from "./report-query.js";
import { ReportLink } from "./report-link.js";
import { RankedTable, type TableProps } from "./report-tables.js";

type ReportHref = (changes: Partial<AnalyticsReportQuery>) => string;

interface PagesTableProps extends TableProps {
  query: AnalyticsReportQuery;
  href: ReportHref;
  /** The search field, rendered through Payload's import map. */
  search: ReactNode;
}

/** The top pages, or the full list with its section, search and page controls. */
export function PagesTable({ report, label, format, query, href, search }: PagesTableProps) {
  const position = report.pageList;
  return (
    <RankedTable
      title={label(position ? "allPages" : "topPages")}
      columns={[label("page"), label("views"), label("averageTime")]}
      empty={label(position && (query.section || query.pageSearch) ? "noMatchingPages" : "empty")}
      toolbar={
        position ? (
          <div className="nwa-toolbar">
            {search}
            {query.section ? (
              <span className="nwa-chip">
                {label("sectionFilter", { section: query.section })}
                <ReportLink href={href({ section: null, pageListPage: 1 })}>{label("clearFilter")}</ReportLink>
              </span>
            ) : null}
          </div>
        ) : null
      }
      rows={report.pages.map((page) => ({
        key: page.path,
        name: page.path,
        href: href({ path: page.path, showAllPages: false, section: null, pageSearch: null, pageListPage: 1 }),
        share: page.share,
        values: [format.number(page.views), format.duration(page.averageDurationSeconds)],
      }))}
      footer={
        <div className="nwa-footer">
          {position ? <PageListPager position={position} label={label} format={format} href={href} /> : null}
          {report.hasMorePages ? (
            <ReportLink
              className="nwa-more"
              href={href({ showAllPages: !position, section: null, pageSearch: null, pageListPage: 1 })}
            >
              {label(position ? "showTopPages" : "showAllPages")}
            </ReportLink>
          ) : null}
        </div>
      }
    />
  );
}

interface PagerProps extends Pick<TableProps, "label" | "format"> {
  position: PageListPosition;
  href: ReportHref;
}

function PageListPager({ position, label, format, href }: PagerProps) {
  if (position.total === 0) return null;
  const range = label("pageListRange", {
    from: format.number(position.from),
    to: format.number(position.to),
    total: format.number(position.total),
  });
  return (
    <nav aria-label={label("allPages")} className="nwa-pager">
      {position.page > 1 ? (
        <ReportLink href={href({ pageListPage: position.page - 1 })}>{label("previousPage")}</ReportLink>
      ) : null}
      <span>{range}</span>
      {position.page < position.pageCount ? (
        <ReportLink href={href({ pageListPage: position.page + 1 })}>{label("nextPage")}</ReportLink>
      ) : null}
    </nav>
  );
}

/** Views per section; a section opens the full page list narrowed to it. */
export function SectionsTable({ report, label, format, href }: TableProps & { href: ReportHref }) {
  return (
    <RankedTable
      title={label("sections")}
      columns={[label("section"), label("pages"), label("views")]}
      empty={label("empty")}
      rows={report.sections.map((row) => ({
        key: row.section,
        name: row.section,
        href: href({ showAllPages: true, section: row.section, pageSearch: null, pageListPage: 1, path: null }),
        share: row.share,
        values: [format.number(row.pageCount), format.number(row.views)],
      }))}
    />
  );
}
