import { describe, expect, it, vi } from "vitest";
import type { AnalyticsModules, AnalyticsServerOptions } from "../core/options.js";
import type { StoredAnalyticsEvent } from "../core/event.js";
import type { AnalyticsSummaryQuery } from "../core/summary.js";
import { MemoryAnalyticsEventStore } from "../core/memory-event-store.js";
import type { AnalyticsEventRequest, RecordAnalyticsEventDeps } from "./record-analytics-event.js";
import { recordAnalyticsEvent } from "./record-analytics-event.js";

const modulesOn: AnalyticsModules = {
  country: true,
  city: true,
  sessions: true,
  clicks: true,
};

const occurredAt = "2026-10-01T00:00:00.000Z";

const summaryQuery: AnalyticsSummaryQuery = {
  from: "2026-10-01T00:00:00.000Z",
  to: "2026-10-01T03:00:00.000Z",
  country: null,
  path: null,
  sessionId: null,
};

function options(modules: AnalyticsModules, enabled = true): AnalyticsServerOptions {
  return { enabled, modules };
}

function deps(
  store: MemoryAnalyticsEventStore,
  serverOptions: AnalyticsServerOptions,
  extras: Partial<RecordAnalyticsEventDeps> = {},
): RecordAnalyticsEventDeps {
  return {
    store,
    options: serverOptions,
    now: () => occurredAt,
    ...extras,
  };
}

async function storedEvent(insert: {
  mock: { results: ReadonlyArray<{ value: unknown }> };
}): Promise<StoredAnalyticsEvent> {
  const result = insert.mock.results[0];
  if (!result || result.value === undefined) throw new Error("insertAnalyticsEvent was not called");
  return result.value as Promise<StoredAnalyticsEvent>;
}

function viewRequest(
  body: Record<string, unknown> = {},
  fields: { country?: unknown; city?: unknown } = {},
): AnalyticsEventRequest {
  return {
    body: {
      type: "view",
      path: "/pricing",
      locale: null,
      sessionId: null,
      ...body,
    },
    country: fields.country,
    city: fields.city,
  };
}

describe("recordAnalyticsEvent", () => {
  it("writes nothing and returns 204 when enabled is false", async () => {
    const store = new MemoryAnalyticsEventStore(modulesOn);
    const insert = vi.spyOn(store, "insertAnalyticsEvent");
    const duration = vi.spyOn(store, "recordAnalyticsDuration");

    const result = await recordAnalyticsEvent(
      viewRequest({ locale: "en", sessionId: "sess-1", country: "FR" }, { country: "DE", city: "Berlin" }),
      deps(store, options(modulesOn, false)),
    );

    expect(result).toEqual({ status: 204, body: null });
    expect(insert).not.toHaveBeenCalled();
    expect(duration).not.toHaveBeenCalled();

    const summary = await store.summarizeAnalytics(summaryQuery, modulesOn);
    expect(summary.totalViews).toBe(0);
  });

  it("discards a country and a city sent on the body", async () => {
    const store = new MemoryAnalyticsEventStore(modulesOn);
    const insert = vi.spyOn(store, "insertAnalyticsEvent");

    const result = await recordAnalyticsEvent(
      viewRequest({ country: "FR", city: "Paris" }),
      deps(store, options(modulesOn)),
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ id: expect.any(String) });
    expect(insert).toHaveBeenCalledOnce();
    const stored = await storedEvent(insert);
    expect(stored.country).toBeNull();
    expect(stored.city).toBeNull();
    expect(stored.path).toBe("/pricing");
    expect(stored.kind).toBe("view");
    expect(stored.occurredAt).toBe(occurredAt);
    expect(stored.eventName).toBeNull();
  });

  it("stores country and city from the request only when those modules are on", async () => {
    const body = { country: "FR", city: "Paris" };
    const fields = { country: "DE", city: "Berlin" };

    const countryOff = { ...modulesOn, country: false };
    const countryOffStore = new MemoryAnalyticsEventStore(countryOff);
    const countryOffInsert = vi.spyOn(countryOffStore, "insertAnalyticsEvent");
    await recordAnalyticsEvent(viewRequest(body, fields), deps(countryOffStore, options(countryOff)));
    const countryOffStored = await storedEvent(countryOffInsert);
    expect(countryOffStored.country).toBeNull();
    expect(countryOffStored.city).toBe("Berlin");

    const cityOff = { ...modulesOn, city: false };
    const cityOffStore = new MemoryAnalyticsEventStore(cityOff);
    const cityOffInsert = vi.spyOn(cityOffStore, "insertAnalyticsEvent");
    await recordAnalyticsEvent(viewRequest(body, fields), deps(cityOffStore, options(cityOff)));
    const cityOffStored = await storedEvent(cityOffInsert);
    expect(cityOffStored.country).toBe("DE");
    expect(cityOffStored.city).toBeNull();

    const bothOnStore = new MemoryAnalyticsEventStore(modulesOn);
    const bothOnInsert = vi.spyOn(bothOnStore, "insertAnalyticsEvent");
    const result = await recordAnalyticsEvent(
      viewRequest(body, fields),
      deps(bothOnStore, options(modulesOn)),
    );
    const bothOnStored = await storedEvent(bothOnInsert);
    expect(result.status).toBe(200);
    expect(bothOnStored.country).toBe("DE");
    expect(bothOnStored.city).toBe("Berlin");
    expect(bothOnStored.country).not.toBe("FR");
    expect(bothOnStored.city).not.toBe("Paris");
  });

  it("reads the JSON body from a Fetch request and ignores a country on that body", async () => {
    const store = new MemoryAnalyticsEventStore(modulesOn);
    const insert = vi.spyOn(store, "insertAnalyticsEvent");
    const request = new Request("https://example.com/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json", "x-country": "DE" },
      body: JSON.stringify({
        type: "view",
        path: "/pricing",
        locale: null,
        sessionId: null,
        country: "FR",
        city: "Paris",
      }),
    });

    const result = await recordAnalyticsEvent(request, deps(store, options(modulesOn)));
    const stored = await storedEvent(insert);

    expect(result.status).toBe(200);
    expect(stored.country).toBeNull();
    expect(stored.city).toBeNull();
    expect(stored.path).toBe("/pricing");
  });

  it("reads country and city passed with the request", async () => {
    const store = new MemoryAnalyticsEventStore(modulesOn);
    const insert = vi.spyOn(store, "insertAnalyticsEvent");
    const request = new Request("https://example.com/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "view",
        path: "/pricing",
        locale: null,
        sessionId: null,
        country: "FR",
        city: "Paris",
      }),
    });

    const result = await recordAnalyticsEvent(
      { request, country: "DE", city: "Berlin" },
      deps(store, options(modulesOn)),
    );
    const stored = await storedEvent(insert);

    expect(result.status).toBe(200);
    expect(stored.country).toBe("DE");
    expect(stored.city).toBe("Berlin");
    expect(stored.path).toBe("/pricing");
  });

  it("drops a click when clicks are off", async () => {
    const modules = { ...modulesOn, clicks: false };
    const store = new MemoryAnalyticsEventStore(modules);
    const insert = vi.spyOn(store, "insertAnalyticsEvent");

    const result = await recordAnalyticsEvent(
      {
        body: {
          type: "click",
          path: "/pricing",
          locale: null,
          sessionId: "sess-1",
          eventName: "cta_clicked",
        },
        headers: {},
      },
      deps(store, options(modules)),
    );

    expect(result).toEqual({ status: 204, body: null });
    expect(insert).not.toHaveBeenCalled();
  });

  it("drops a session id when sessions are off", async () => {
    const modules = { ...modulesOn, sessions: false };
    const store = new MemoryAnalyticsEventStore(modules);
    const insert = vi.spyOn(store, "insertAnalyticsEvent");

    const result = await recordAnalyticsEvent(
      viewRequest({ sessionId: "sess-1" }),
      deps(store, options(modules)),
    );

    expect(result.status).toBe(200);
    const stored = await storedEvent(insert);
    expect(stored.sessionId).toBeNull();

    const summary = await store.summarizeAnalytics(summaryQuery, modulesOn);
    expect(summary.sessions).toEqual([]);
  });

  it("requires a path that starts with / and does not contain a scheme, and strips the query string", async () => {
    const store = new MemoryAnalyticsEventStore(modulesOn);
    const insert = vi.spyOn(store, "insertAnalyticsEvent");
    const serverOptions = options(modulesOn);

    for (const path of [
      "pricing",
      "https://example.com/pricing",
      "http://evil.test/a",
      "/docs/https://example.com",
      "",
    ]) {
      const result = await recordAnalyticsEvent(
        viewRequest({ path }),
        deps(store, serverOptions),
      );
      expect(result).toEqual({ status: 400, body: null });
    }
    expect(insert).not.toHaveBeenCalled();

    const result = await recordAnalyticsEvent(
      viewRequest({ path: "/pricing?plan=pro&x=1#top", locale: "en" }),
      deps(store, serverOptions),
    );
    expect(result.status).toBe(200);
    expect(result.body?.id).toEqual(expect.any(String));
    const stored = await storedEvent(insert);
    expect(stored.path).toBe("/pricing");
  });

  it("requires eventName to match ^[a-z0-9_]+$", async () => {
    const store = new MemoryAnalyticsEventStore(modulesOn);
    const insert = vi.spyOn(store, "insertAnalyticsEvent");
    const serverOptions = options(modulesOn);

    for (const eventName of ["CTA", "cta-clicked", "cta clicked", "", "cta.clicked", "9Bad"]) {
      const result = await recordAnalyticsEvent(
        {
          body: {
            type: "click",
            path: "/pricing",
            locale: null,
            sessionId: null,
            eventName,
          },
          headers: {},
        },
        deps(store, serverOptions),
      );
      expect(result).toEqual({ status: 400, body: null });
    }
    expect(insert).not.toHaveBeenCalled();

    const result = await recordAnalyticsEvent(
      {
        body: {
          type: "click",
          path: "/pricing?ref=home",
          locale: "en",
          sessionId: "sess-1",
          eventName: "cta_clicked",
        },
        headers: {},
      },
      deps(store, serverOptions),
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ id: expect.any(String) });
    const stored = await storedEvent(insert);
    expect(stored.kind).toBe("click");
    expect(stored.eventName).toBe("cta_clicked");
    expect(stored.path).toBe("/pricing");
    expect(stored.sessionId).toBe("sess-1");
  });

  it("records a duration and returns 204", async () => {
    const store = new MemoryAnalyticsEventStore(modulesOn);
    const serverOptions = options(modulesOn);
    const view = await recordAnalyticsEvent(viewRequest({}), deps(store, serverOptions));
    expect(view.status).toBe(200);
    const id = view.body?.id;
    expect(id).toEqual(expect.any(String));

    const result = await recordAnalyticsEvent(
      { body: { type: "duration", id, durationSeconds: 12 }, headers: {} },
      deps(store, serverOptions),
    );

    expect(result).toEqual({ status: 204, body: null });
    const summary = await store.summarizeAnalytics(summaryQuery, modulesOn);
    expect(summary.totalViews).toBe(1);
    expect(summary.averageDurationSeconds).toBe(12);
  });

  it("returns 400 for an unknown body", async () => {
    const store = new MemoryAnalyticsEventStore(modulesOn);
    const insert = vi.spyOn(store, "insertAnalyticsEvent");
    const duration = vi.spyOn(store, "recordAnalyticsDuration");

    for (const body of [null, "view", [], { type: "nope" }, { type: "view" }, {}, 4]) {
      const result = await recordAnalyticsEvent(
        { body, headers: {} },
        deps(store, options(modulesOn)),
      );
      expect(result).toEqual({ status: 400, body: null });
    }

    expect(insert).not.toHaveBeenCalled();
    expect(duration).not.toHaveBeenCalled();
  });

  it("uses the server clock when deps.now is omitted", async () => {
    const store = new MemoryAnalyticsEventStore(modulesOn);
    const insert = vi.spyOn(store, "insertAnalyticsEvent");
    const before = Date.now();

    await recordAnalyticsEvent(viewRequest({}), {
      store,
      options: options(modulesOn),
    });

    const stored = await storedEvent(insert);
    const at = Date.parse(stored.occurredAt);
    expect(Number.isNaN(at)).toBe(false);
    expect(at).toBeGreaterThanOrEqual(before);
    expect(at).toBeLessThanOrEqual(Date.now());
  });
});
