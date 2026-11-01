import { describe, expect, it } from "vitest";
import type { AnalyticsModules } from "../../core/options.js";
import { parseReportQuery, reportHref } from "./report-query.js";

const modules: AnalyticsModules = { country: true, city: true, sessions: false, clicks: true };

describe("parseReportQuery", () => {
  it("reads the page list's section, search and page", () => {
    const query = parseReportQuery({ pages: "all", section: "/news", q: " harvest ", page: "3" }, modules);

    expect(query).toMatchObject({ showAllPages: true, section: "/news", pageSearch: "harvest", pageListPage: 3 });
  });

  it("falls back to the first page and no filters for values it cannot use", () => {
    const query = parseReportQuery({ section: "news", q: "", page: "-2" }, modules);

    expect(query).toMatchObject({ section: null, pageSearch: null, pageListPage: 1 });
  });
});

describe("reportHref", () => {
  it("leaves the first page out of the URL", () => {
    const query = parseReportQuery({ pages: "all", page: "2" }, modules);

    expect(reportHref("/admin/analytics", query, { pageListPage: 1 })).toBe("/admin/analytics?pages=all");
    expect(reportHref("/admin/analytics", query)).toBe("/admin/analytics?pages=all&page=2");
  });
});
