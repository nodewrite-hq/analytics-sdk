import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnalyticsBucketUnit } from "../../core/period.js";
import type { AnalyticsModules } from "../../core/options.js";
import { reportFormat } from "./format.js";
import type { AnalyticsReport } from "./report.js";
import type { AnalyticsReportQuery } from "./report-query.js";
import type { ReportLabel } from "./report-tables.js";
import { AnalyticsReportView } from "./report-view.js";
import { ENGLISH_ANALYTICS_LABELS } from "./translations.js";

const modules: AnalyticsModules = { country: true, city: false, sessions: false, clicks: true };

const query: AnalyticsReportQuery = {
  period: "7d",
  country: null,
  path: null,
  session: null,
  showAllPages: false,
  section: null,
  pageSearch: null,
  pageListPage: 1,
};

const report: AnalyticsReport = {
  totals: { views: 1234, averageDurationSeconds: 75, clicks: 3 },
  viewsOverTime: [
    { start: "2026-10-29T23:00:00.000Z", views: 4 },
    { start: "2026-10-30T23:00:00.000Z", views: 9 },
  ],
  pages: [{ path: "/aktivnosti", views: 9, share: 1, averageDurationSeconds: 30 }],
  hasMorePages: true,
  pageList: null,
  sections: [
    { section: "/aktivnosti", views: 9, pageCount: 1, share: 1 },
    { section: "/", views: 4, pageCount: 1, share: 0.44 },
  ],
  countries: [{ country: "ME", views: 9, share: 1 }],
  countryOptions: ["ME"],
  cities: null,
  clicks: [{ eventName: "phone_clicked", count: 3 }],
  sessions: null,
  trail: null,
};

const label: ReportLabel = (key, vars) =>
  ENGLISH_ANALYTICS_LABELS[key].replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(vars?.[name] ?? ""));

function render(overrides: Partial<AnalyticsReportQuery> = {}, reportOverrides: Partial<AnalyticsReport> = {}): string {
  return renderToStaticMarkup(
    <AnalyticsReportView
      report={{ ...report, ...reportOverrides }}
      query={{ ...query, ...overrides }}
      modules={modules}
      viewHref="/administrator/analytics"
      label={label}
      format={reportFormat("en", "Europe/Podgorica", AnalyticsBucketUnit.DAY)}
      eventLabel={(eventName) => (eventName === "phone_clicked" ? "Phone calls" : eventName)}
      filters={<div data-testid="filters" />}
      pageSearch={<div data-testid="page-search" />}
    />,
  );
}

describe("AnalyticsReportView", () => {
  it("shows the totals, the chart, the top pages and the countries with flags", () => {
    const html = render();

    expect(html).toContain("1,234");
    expect(html).toContain("1 min 15 sec");
    expect(html).toContain("Top pages");
    expect(html).toContain('href="/administrator/analytics?path=%2Faktivnosti"');
    expect(html).toContain('href="/administrator/analytics?pages=all"');
    expect(html).toContain("Montenegro");
    expect(html).toContain('href="/administrator/analytics?country=ME"');
    expect(html).toContain('src="data:image/svg+xml');
    expect(html).toContain("Phone calls");
    expect(html).toContain("<svg");
    expect(html).toContain("Oct 30");
    expect(html).toContain("Oct 31");
    expect(html).toContain('class="nwa-chart__tip-count" x="8" y="32">4</text>');
    expect(html).toContain('class="nwa-chart__tip-count" x="8" y="32">9</text>');
    expect(html).toContain('data-testid="filters"');
  });

  it("leaves clicks out when nothing was clicked", () => {
    const html = renderToStaticMarkup(
      <AnalyticsReportView
        report={{ ...report, totals: { ...report.totals, clicks: 0 }, clicks: [] }}
        query={query}
        modules={modules}
        viewHref="/administrator/analytics"
        label={label}
        format={reportFormat("en", "Europe/Podgorica", AnalyticsBucketUnit.DAY)}
        eventLabel={(eventName) => eventName}
        filters={null}
        pageSearch={null}
      />,
    );

    expect(html).not.toContain("Clicks");
    expect(html).not.toContain("Phone calls");
    expect(html).toContain("1,234");
  });

  it("shows the page filter with a link that clears it", () => {
    const html = render({ path: "/aktivnosti", period: "30d" });

    expect(html).toContain("Page: /aktivnosti");
    expect(html).toContain('href="/administrator/analytics?period=30d"');
  });

  it("links each section to the full page list narrowed to it", () => {
    const html = render();

    expect(html).toContain("Sections");
    expect(html).toContain('href="/administrator/analytics?pages=all&amp;section=%2Faktivnosti"');
    expect(html).not.toContain('data-testid="page-search"');
  });

  it("shows the search, the section and the pager on the full list", () => {
    const html = render(
      { showAllPages: true, section: "/aktivnosti", pageListPage: 2 },
      { pageList: { page: 2, pageCount: 3, from: 26, to: 50, total: 60 } },
    );

    expect(html).toContain('data-testid="page-search"');
    expect(html).toContain("Section: /aktivnosti");
    expect(html).toContain("26–50 of 60");
    expect(html).toContain('href="/administrator/analytics?pages=all&amp;section=%2Faktivnosti&amp;page=3"');
    expect(html).toContain("Show top pages only");
  });
});
