import { describe, expect, it, vi } from "vitest";
import type { AnalyticsModules } from "../core/options.js";
import { MemoryAnalyticsEventStore } from "../core/memory-event-store.js";
import { analyticsEventsEndpoint, handleAnalyticsEvent } from "./endpoint.js";

const modulesOn: AnalyticsModules = {
  country: true,
  city: true,
  sessions: true,
  clicks: true,
};

const occurredAt = "2026-10-01T00:00:00.000Z";

describe("analytics endpoint", () => {
  it("calls recordAnalyticsEvent and does not store a country from the body", async () => {
    const store = new MemoryAnalyticsEventStore(modulesOn);
    const insert = vi.spyOn(store, "insertAnalyticsEvent");

    const response = await handleAnalyticsEvent(
      {
        body: {
          type: "view",
          path: "/pricing",
          locale: "en",
          sessionId: null,
          country: "FR",
          city: "Paris",
        },
        headers: {},
      },
      {
        store,
        options: { enabled: true, modules: modulesOn },
        now: () => occurredAt,
      },
    );

    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledOnce();
    expect(insert.mock.calls[0]?.[0].country).toBeNull();
    expect(insert.mock.calls[0]?.[0].city).toBeNull();

    const summary = await store.summarizeAnalytics(
      {
        from: occurredAt,
        to: occurredAt,
        country: null,
        path: null,
        sessionId: null,
      },
      modulesOn,
    );
    expect(summary.totalViews).toBe(1);
    expect(summary.byCountry).toEqual([]);
  });

  it("registers a POST endpoint at /analytics/events", () => {
    const endpoint = analyticsEventsEndpoint({ enabled: true, modules: modulesOn });
    expect(endpoint.method).toBe("post");
    expect(endpoint.path).toBe("/analytics/events");
  });
});
