import type { Payload, PayloadRequest } from "payload";
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

  it("stores the country and city that the geo option reads from the request headers", async () => {
    const created: Record<string, unknown>[] = [];
    const endpoint = analyticsEventsEndpoint({
      enabled: true,
      modules: modulesOn,
      geo: (headers) => ({
        country: headers.get("x-host-country"),
        city: headers.get("x-host-city"),
      }),
    });

    const response = await endpoint.handler(
      payloadRequest(created, { "x-host-country": "ME", "x-host-city": "Tivat" }),
    );

    expect(response.status).toBe(200);
    expect(created[0]).toMatchObject({ country: "ME", city: "Tivat" });
  });

  it("stores no country or city when the plugin has no geo option", async () => {
    const created: Record<string, unknown>[] = [];
    const endpoint = analyticsEventsEndpoint({ enabled: true, modules: modulesOn });

    await endpoint.handler(payloadRequest(created, { "x-host-country": "ME" }));

    expect(created[0]).toMatchObject({ country: null, city: null });
  });

  it("registers a POST endpoint at /analytics/events", () => {
    const endpoint = analyticsEventsEndpoint({ enabled: true, modules: modulesOn });
    expect(endpoint.method).toBe("post");
    expect(endpoint.path).toBe("/analytics/events");
  });
});

function payloadRequest(
  created: Record<string, unknown>[],
  headers: Record<string, string>,
): PayloadRequest {
  const payload = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      created.push(data);
      return { id: created.length, ...data };
    },
  };
  return {
    payload: payload as unknown as Payload,
    headers: new Headers(headers),
    json: async () => ({ type: "view", path: "/", locale: "en", sessionId: null }),
  } as unknown as PayloadRequest;
}
