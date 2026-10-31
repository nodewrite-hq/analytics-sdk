import { describe, expect, it } from "vitest";
import type { AnalyticsModules } from "../../core/options.js";
import type { AnalyticsSummary } from "../../core/summary.js";
import { buildAnalyticsReport } from "./report.js";
import type { AnalyticsReportQuery } from "./report-query.js";

const modules: AnalyticsModules = { country: true, city: false, sessions: false, clicks: true };

const query: AnalyticsReportQuery = {
  period: "7d",
  country: null,
  path: null,
  session: null,
  showAllPages: false,
};

function summary(overrides: Partial<AnalyticsSummary> = {}): AnalyticsSummary {
  return {
    totalViews: 0,
    averageDurationSeconds: 0,
    byPath: [],
    byCountry: [],
    byEventName: [],
    ...overrides,
  };
}

const sevenPages = ["/a", "/b", "/c", "/d", "/e", "/f", "/g"].map((path, index) => ({
  path,
  views: index + 1,
  averageDurationSeconds: 10,
}));

describe("buildAnalyticsReport", () => {
  it("shows the 5 most viewed pages, most first, and says more exist", () => {
    const current = summary({ byPath: sevenPages });
    const report = buildAnalyticsReport({ summary: current, periodSummary: current, modules, query });

    expect(report.pages.map((page) => page.path)).toEqual(["/g", "/f", "/e", "/d", "/c"]);
    expect(report.pages[0]?.share).toBe(1);
    expect(report.hasMorePages).toBe(true);
  });

  it("shows every page when all pages are asked for", () => {
    const current = summary({ byPath: sevenPages });
    const report = buildAnalyticsReport({
      summary: current,
      periodSummary: current,
      modules,
      query: { ...query, showAllPages: true },
    });

    expect(report.pages).toHaveLength(7);
  });

  it("offers only countries with views in the period, even with a country chosen", () => {
    const filtered = summary({ byCountry: [{ country: "ME", views: 3 }] });
    const period = summary({
      byCountry: [
        { country: "DE", views: 1 },
        { country: "ME", views: 3 },
      ],
    });
    const report = buildAnalyticsReport({
      summary: filtered,
      periodSummary: period,
      modules,
      query: { ...query, country: "ME" },
    });

    expect(report.countryOptions).toEqual(["ME", "DE"]);
    expect(report.countries?.map((row) => row.country)).toEqual(["ME"]);
  });

  it("adds up named clicks and leaves off what a module turns off", () => {
    const current = summary({
      byEventName: [
        { eventName: "phone_clicked", count: 2 },
        { eventName: "email_clicked", count: 5 },
      ],
    });
    const report = buildAnalyticsReport({ summary: current, periodSummary: current, modules, query });

    expect(report.totals.clicks).toBe(7);
    expect(report.clicks?.[0]?.eventName).toBe("email_clicked");
    expect(report.cities).toBeNull();
    expect(report.sessions).toBeNull();

    const quiet = buildAnalyticsReport({
      summary: current,
      periodSummary: current,
      modules: { ...modules, clicks: false, country: false },
      query,
    });
    expect(quiet.totals.clicks).toBeNull();
    expect(quiet.countries).toBeNull();
    expect(quiet.countryOptions).toEqual([]);
  });
});
