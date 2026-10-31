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
};

const report: AnalyticsReport = {
  totals: { views: 1234, averageDurationSeconds: 75, clicks: 3 },
  viewsOverTime: [
    { start: "2026-10-29T23:00:00.000Z", views: 4 },
    { start: "2026-10-30T23:00:00.000Z", views: 9 },
  ],
  pages: [{ path: "/aktivnosti", views: 9, share: 1, averageDurationSeconds: 30 }],
  hasMorePages: true,
  countries: [{ country: "ME", views: 9, share: 1 }],
  countryOptions: ["ME"],
  cities: null,
  clicks: [{ eventName: "phone_clicked", count: 3 }],
  sessions: null,
  trail: null,
};

const label: ReportLabel = (key, vars) =>
  ENGLISH_ANALYTICS_LABELS[key].replace("{{path}}", String(vars?.path ?? ""));

function render(overrides: Partial<AnalyticsReportQuery> = {}): string {
  return renderToStaticMarkup(
    <AnalyticsReportView
      report={report}
      query={{ ...query, ...overrides }}
      modules={modules}
      viewHref="/administrator/analytics"
      label={label}
      format={reportFormat("en", "Europe/Podgorica", AnalyticsBucketUnit.DAY)}
      eventLabel={(eventName) => (eventName === "phone_clicked" ? "Phone calls" : eventName)}
      filters={<div data-testid="filters" />}
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
    expect(html).toContain('data-testid="filters"');
  });

  it("shows the page filter with a link that clears it", () => {
    const html = render({ path: "/aktivnosti", period: "30d" });

    expect(html).toContain("Page: /aktivnosti");
    expect(html).toContain('href="/administrator/analytics?period=30d"');
  });
});
