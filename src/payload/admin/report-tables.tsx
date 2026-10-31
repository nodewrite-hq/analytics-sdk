import type { CSSProperties, ReactNode } from "react";
import { CountryFlag } from "./country-flag.js";
import type { ReportFormat } from "./format.js";
import type { AnalyticsReport } from "./report.js";
import type { AnalyticsLabelKey } from "./translations.js";

export type ReportLabel = (key: AnalyticsLabelKey, vars?: Record<string, unknown>) => string;

export interface RankedRow {
  key: string;
  name: ReactNode;
  /** A filter link for the row, when it can narrow the report. */
  href?: string;
  /** From 0 to 1; draws the bar behind the row. */
  share?: number;
  values: string[];
}

interface RankedTableProps {
  title: string;
  /** The name column first, then one per value. */
  columns: string[];
  rows: RankedRow[];
  empty: string;
  footer?: ReactNode;
}

export function RankedTable({ title, columns, rows, empty, footer }: RankedTableProps) {
  const [nameColumn, ...valueColumns] = columns;
  return (
    <section className="nwa-card">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="nwa-empty">{empty}</p>
      ) : (
        <table className="nwa-table">
          <thead>
            <tr>
              <th scope="col">{nameColumn}</th>
              {valueColumns.map((column) => (
                <th className="nwa-number" key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td
                  className={row.share === undefined ? undefined : "nwa-bar"}
                  style={row.share === undefined ? undefined : ({ "--nwa-share": row.share } as CSSProperties)}
                >
                  {row.href ? (
                    <a className="nwa-name" href={row.href}>
                      {row.name}
                    </a>
                  ) : (
                    <span className="nwa-name">{row.name}</span>
                  )}
                </td>
                {row.values.map((value, index) => (
                  <td className="nwa-number" key={`${row.key}-${valueColumns[index] ?? index}`}>
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {footer}
    </section>
  );
}

interface TableProps {
  report: AnalyticsReport;
  label: ReportLabel;
  format: ReportFormat;
}

export function PagesTable({
  report,
  label,
  format,
  pageHref,
  toggleHref,
  showAll,
}: TableProps & { pageHref: (path: string) => string; toggleHref: string; showAll: boolean }) {
  return (
    <RankedTable
      title={label(showAll ? "allPages" : "topPages")}
      columns={[label("page"), label("views"), label("averageTime")]}
      empty={label("empty")}
      rows={report.pages.map((page) => ({
        key: page.path,
        name: page.path,
        href: pageHref(page.path),
        share: page.share,
        values: [format.number(page.views), format.duration(page.averageDurationSeconds)],
      }))}
      footer={
        report.hasMorePages ? (
          <a className="nwa-more" href={toggleHref}>
            {label(showAll ? "showTopPages" : "showAllPages")}
          </a>
        ) : null
      }
    />
  );
}

export function CountriesTable({
  report,
  label,
  format,
  countryHref,
}: TableProps & { countryHref: (code: string) => string }) {
  return (
    <RankedTable
      title={label("countries")}
      columns={[label("country"), label("views")]}
      empty={label("empty")}
      rows={(report.countries ?? []).map((row) => ({
        key: row.country,
        name: (
          <>
            <CountryFlag code={row.country} />
            {format.country(row.country)}
          </>
        ),
        href: countryHref(row.country),
        share: row.share,
        values: [format.number(row.views)],
      }))}
    />
  );
}

export function ClicksTable({
  report,
  label,
  format,
  eventLabel,
}: TableProps & { eventLabel: (eventName: string) => string }) {
  return (
    <RankedTable
      title={label("clicks")}
      columns={[label("event"), label("count")]}
      empty={label("empty")}
      rows={(report.clicks ?? []).map((row) => ({
        key: row.eventName,
        name: eventLabel(row.eventName),
        values: [format.number(row.count)],
      }))}
    />
  );
}

export function CitiesTable({ report, label, format }: TableProps) {
  return (
    <RankedTable
      title={label("cities")}
      columns={[label("city"), label("views")]}
      empty={label("empty")}
      rows={(report.cities ?? []).map((row) => ({
        key: row.city,
        name: row.city,
        share: row.share,
        values: [format.number(row.views)],
      }))}
    />
  );
}
