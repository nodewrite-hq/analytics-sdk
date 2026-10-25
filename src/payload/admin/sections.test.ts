import { describe, expect, it } from "vitest";
import type { AnalyticsModules } from "../../core/options.js";
import type { AnalyticsSummary } from "../../core/summary.js";
import { adminSections } from "./sections.js";

const modulesOn: AnalyticsModules = {
  country: true,
  city: true,
  sessions: true,
  clicks: true,
};

const summary: AnalyticsSummary = {
  totalViews: 2,
  averageDurationSeconds: 5,
  byPath: [{ path: "/pricing", views: 2, averageDurationSeconds: 5 }],
  byCountry: [{ country: "US", views: 2 }],
  byCity: [{ city: "Austin", views: 1 }],
  sessions: [{ id: "sess-1", startedAt: "2026-10-01T00:00:00.000Z", pageCount: 2 }],
  byEventName: [{ eventName: "cta_clicked", count: 1 }],
  events: [
    {
      id: "later",
      kind: "click",
      path: "/pricing",
      occurredAt: "2026-10-01T00:02:00.000Z",
      eventName: "cta_clicked",
    },
    {
      id: "earlier",
      kind: "view",
      path: "/pricing",
      occurredAt: "2026-10-01T00:01:00.000Z",
      eventName: null,
    },
  ],
};

describe("adminSections", () => {
  it("omits city, sessions, and clicks when those modules are off", () => {
    const sections = adminSections(
      summary,
      { country: false, city: false, sessions: false, clicks: false },
      {},
    );

    expect(sections.map((section) => section.kind)).toEqual(["totals", "paths"]);
  });

  it("includes the country table when the module is on", () => {
    const sections = adminSections(
      summary,
      { country: true, city: false, sessions: false, clicks: false },
      {},
    );

    expect(sections.map((section) => section.kind)).toEqual(["totals", "paths", "countries"]);
    expect(sections[2]).toEqual({ kind: "countries", rows: summary.byCountry });
  });

  it("includes the ordered trail only when a session query is set and sessions are on", () => {
    const withTrail = adminSections(summary, modulesOn, { session: "sess-1" });

    expect(withTrail.map((section) => section.kind)).toEqual([
      "totals",
      "paths",
      "countries",
      "cities",
      "namedClicks",
      "trail",
    ]);
    expect(withTrail.filter((section) => section.kind === "trail")).toEqual([
      {
        kind: "trail",
        events: [
          {
            id: "earlier",
            kind: "view",
            path: "/pricing",
            occurredAt: "2026-10-01T00:01:00.000Z",
            eventName: null,
          },
          {
            id: "later",
            kind: "click",
            path: "/pricing",
            occurredAt: "2026-10-01T00:02:00.000Z",
            eventName: "cta_clicked",
          },
        ],
      },
    ]);

    const sessionsOff = adminSections(summary, { ...modulesOn, sessions: false }, { session: "sess-1" });
    expect(sessionsOff.map((section) => section.kind)).not.toContain("trail");
    expect(sessionsOff.map((section) => section.kind)).not.toContain("sessions");

    const sessionList = adminSections(summary, modulesOn, {});
    expect(sessionList.map((section) => section.kind)).toEqual([
      "totals",
      "paths",
      "countries",
      "cities",
      "namedClicks",
      "sessions",
    ]);
  });
});
