import { describe, expect, it } from "vitest";
import type { StoredAnalyticsEvent } from "./event.js";
import type { AnalyticsModules } from "./options.js";
import { summarizeAnalyticsEvents } from "./summarize-events.js";

const modules: AnalyticsModules = { country: true, city: false, sessions: false, clicks: true };

function event(overrides: Partial<StoredAnalyticsEvent>): StoredAnalyticsEvent {
  return {
    id: overrides.id ?? "1",
    kind: "view",
    path: "/",
    locale: null,
    occurredAt: "2026-10-30T10:00:00.000Z",
    durationSeconds: null,
    country: null,
    city: null,
    sessionId: null,
    eventName: null,
    ...overrides,
  };
}

const query = {
  from: "2026-10-30T00:00:00.000Z",
  to: "2026-10-31T23:59:59.000Z",
  country: null,
  path: null,
  sessionId: null,
};

describe("summarizeAnalyticsEvents", () => {
  it("counts views per bucket, with an empty bucket at zero and clicks left out", () => {
    const rows = [
      event({ id: "1", occurredAt: "2026-10-30T09:00:00.000Z" }),
      event({ id: "2", occurredAt: "2026-10-30T23:59:59.000Z" }),
      event({ id: "3", occurredAt: "2026-10-30T12:00:00.000Z", kind: "click", eventName: "phone_clicked" }),
    ];
    const buckets = [
      { start: "2026-10-30T00:00:00.000Z", end: "2026-10-31T00:00:00.000Z" },
      { start: "2026-10-31T00:00:00.000Z", end: "2026-11-01T00:00:00.000Z" },
    ];

    const summary = summarizeAnalyticsEvents(rows, { ...query, buckets }, modules);

    expect(summary.viewsOverTime).toEqual([
      { start: "2026-10-30T00:00:00.000Z", views: 2 },
      { start: "2026-10-31T00:00:00.000Z", views: 0 },
    ]);
    expect(summary.byEventName).toEqual([{ eventName: "phone_clicked", count: 1 }]);
  });

  it("leaves viewsOverTime out without buckets", () => {
    expect(summarizeAnalyticsEvents([event({})], query, modules).viewsOverTime).toBeUndefined();
  });
});
