import type { ReactNode } from "react";
import type { AnalyticsModules } from "../../core/options.js";
import type { ReportFormat } from "./format.js";
import type { AnalyticsReport } from "./report.js";
import { type AnalyticsReportQuery, reportHref } from "./report-query.js";
import { SessionsSection } from "./report-sessions.js";
import { REPORT_STYLE } from "./report-style.js";
import { PagesTable, SectionsTable } from "./report-pages.js";
import { ReportLink } from "./report-link.js";
import { CitiesTable, ClicksTable, CountriesTable, type ReportLabel } from "./report-tables.js";
import { ViewsChart } from "./views-chart.js";

export interface AnalyticsReportViewProps {
  report: AnalyticsReport;
  query: AnalyticsReportQuery;
  modules: AnalyticsModules;
  /** The view's own URL, under the host's admin route. */
  viewHref: string;
  label: ReportLabel;
  format: ReportFormat;
  eventLabel: (eventName: string) => string;
  /** The period and country dropdowns, rendered through Payload's import map. */
  filters: ReactNode;
  /** The full page list's search field, rendered through Payload's import map. */
  pageSearch: ReactNode;
}

export function AnalyticsReportView(props: AnalyticsReportViewProps) {
  const { report, query, modules, viewHref, label, format, eventLabel, filters, pageSearch } = props;
  const href = (changes: Partial<AnalyticsReportQuery>) => reportHref(viewHref, query, changes);
  const tableProps = { report, label, format };

  return (
    <div className="nwa-report">
      <style>{REPORT_STYLE}</style>
      <header className="nwa-header">
        <h1>{label("title")}</h1>
        {filters}
      </header>
      {query.path ? (
        <div className="nwa-chips">
          <span className="nwa-chip">
            {label("pageFilter", { path: query.path })}
            <ReportLink href={href({ path: null })}>{label("clearFilter")}</ReportLink>
          </span>
        </div>
      ) : null}
      <Totals report={report} label={label} format={format} />
      <section className="nwa-card">
        <h2>{label("viewsOverTime")}</h2>
        <ViewsChart
          description={label("viewsOverTime")}
          formatNumber={format.number}
          points={report.viewsOverTime.map((point) => ({
            label: format.bucket(point.start),
            views: point.views,
            title: `${format.bucket(point.start)}: ${format.number(point.views)} ${label("views")}`,
          }))}
        />
      </section>
      <div className="nwa-columns">
        <PagesTable {...tableProps} query={query} href={href} search={pageSearch} />
        {hasSections(report) ? <SectionsTable {...tableProps} href={href} /> : null}
        {modules.country ? <CountriesTable {...tableProps} countryHref={(country) => href({ country })} /> : null}
        {hasClicks(report) ? <ClicksTable {...tableProps} eventLabel={eventLabel} /> : null}
        {modules.city ? <CitiesTable {...tableProps} /> : null}
      </div>
      {modules.sessions ? (
        <SessionsSection
          {...tableProps}
          eventLabel={eventLabel}
          sessionHref={(session) => href({ session })}
          allSessionsHref={href({ session: null })}
        />
      ) : null}
    </div>
  );
}

/** Sections help only when the site has more than one. */
function hasSections(report: AnalyticsReport): boolean {
  return report.sections.length > 1;
}

/** Clicks stay off the screen until at least one named click was stored. */
function hasClicks(report: AnalyticsReport): boolean {
  return (report.clicks ?? []).some((row) => row.count > 0);
}

function Totals({ report, label, format }: { report: AnalyticsReport; label: ReportLabel; format: ReportFormat }) {
  const stats = [
    { key: "views", name: label("views"), value: format.number(report.totals.views) },
    { key: "time", name: label("averageTime"), value: format.duration(report.totals.averageDurationSeconds) },
  ];
  if (hasClicks(report)) {
    stats.push({ key: "clicks", name: label("clicks"), value: format.number(report.totals.clicks ?? 0) });
  }

  return (
    <dl className="nwa-cards">
      {stats.map((stat) => (
        <div className="nwa-card nwa-stat" key={stat.key}>
          <dt>{stat.name}</dt>
          <dd>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
