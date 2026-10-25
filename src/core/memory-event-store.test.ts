import { describe, expect, it } from "vitest";
import { AnalyticsEventKind } from "./event-kind.js";
import type { AnalyticsModules } from "./options.js";
import type { NewAnalyticsEvent } from "./event.js";
import type { AnalyticsSummaryQuery } from "./summary.js";
import { MemoryAnalyticsEventStore } from "./memory-event-store.js";

const modulesOff: AnalyticsModules = {
  country: false,
  city: false,
  sessions: false,
  clicks: false,
};

const modulesOn: AnalyticsModules = {
  country: true,
  city: true,
  sessions: true,
  clicks: true,
};

function analyticsEvent(overrides: Partial<NewAnalyticsEvent> = {}): NewAnalyticsEvent {
  return {
    kind: AnalyticsEventKind.VIEW,
    path: "/pricing",
    locale: "en",
    durationSeconds: null,
    country: "US",
    city: "Austin",
    sessionId: "sess-1",
    eventName: null,
    ...overrides,
  };
}

function summaryQuery(overrides: Partial<AnalyticsSummaryQuery> = {}): AnalyticsSummaryQuery {
  return {
    from: "2026-10-01T00:00:00.000Z",
    to: "2026-10-01T03:00:00.000Z",
    country: null,
    path: null,
    sessionId: null,
    ...overrides,
  };
}

describe("MemoryAnalyticsEventStore", () => {
  it("disabled modules store null country, city, session id, and event name", async () => {
    const store = new MemoryAnalyticsEventStore(modulesOff);
    const occurredAt = "2026-10-01T00:00:00.000Z";
    const input = analyticsEvent({
      durationSeconds: 12,
      country: "US",
      city: "Austin",
      sessionId: "sess-1",
      eventName: "cta_clicked",
    });

    const stored = await store.insertAnalyticsEvent(input, occurredAt);
    const again = await store.insertAnalyticsEvent(
      analyticsEvent({ kind: AnalyticsEventKind.CLICK, eventName: "signup" }),
      occurredAt,
    );

    expect(input.country).toBe("US");
    expect(input.city).toBe("Austin");
    expect(input.sessionId).toBe("sess-1");
    expect(input.eventName).toBe("cta_clicked");

    expect(stored.country).toBeNull();
    expect(stored.city).toBeNull();
    expect(stored.sessionId).toBeNull();
    expect(stored.eventName).toBeNull();
    expect(stored.kind).toBe(AnalyticsEventKind.VIEW);
    expect(stored.path).toBe("/pricing");
    expect(stored.locale).toBe("en");
    expect(stored.durationSeconds).toBe(12);
    expect(stored.occurredAt).toBe(occurredAt);
    expect(stored.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    expect(again.kind).toBe(AnalyticsEventKind.CLICK);
    expect(again.country).toBeNull();
    expect(again.city).toBeNull();
    expect(again.sessionId).toBeNull();
    expect(again.eventName).toBeNull();
    expect(again.id).not.toBe(stored.id);
  });

  it("duration below 0 or above 1800 is ignored; a click id is ignored", async () => {
    const store = new MemoryAnalyticsEventStore(modulesOn);
    const view = await store.insertAnalyticsEvent(
      analyticsEvent({ durationSeconds: 12, sessionId: null, country: null, city: null }),
      "2026-10-01T00:00:00.000Z",
    );
    const click = await store.insertAnalyticsEvent(
      analyticsEvent({
        kind: AnalyticsEventKind.CLICK,
        durationSeconds: 4,
        eventName: "cta_clicked",
      }),
      "2026-10-01T00:00:01.000Z",
    );

    await store.recordAnalyticsDuration(view.id, -1);
    await store.recordAnalyticsDuration(view.id, 1801);
    expect(view.durationSeconds).toBe(12);

    await store.recordAnalyticsDuration(view.id, 0);
    expect(view.durationSeconds).toBe(0);
    await store.recordAnalyticsDuration(view.id, 1800);
    expect(view.durationSeconds).toBe(1800);
    await store.recordAnalyticsDuration(view.id, 1800.1);
    expect(view.durationSeconds).toBe(1800);

    await store.recordAnalyticsDuration(click.id, 15);
    expect(click.durationSeconds).toBe(4);

    await expect(store.recordAnalyticsDuration("missing-id", 10)).resolves.toBeUndefined();
    expect(view.durationSeconds).toBe(1800);
    expect(click.durationSeconds).toBe(4);
  });

  it("summary totals and path groups; byCountry absent when the module is off", async () => {
    const store = new MemoryAnalyticsEventStore(modulesOn);
    const from = "2026-10-01T00:00:00.000Z";
    const to = "2026-10-01T03:00:00.000Z";

    await store.insertAnalyticsEvent(
      analyticsEvent({ path: "/a", durationSeconds: 10, country: "US", sessionId: "sess-1" }),
      from,
    );
    await store.insertAnalyticsEvent(
      analyticsEvent({ path: "/a", durationSeconds: 11, country: "US", sessionId: "sess-1" }),
      "2026-10-01T01:00:00.000Z",
    );
    await store.insertAnalyticsEvent(
      analyticsEvent({
        path: "/b",
        durationSeconds: null,
        country: "DE",
        city: "Berlin",
        sessionId: "sess-2",
      }),
      to,
    );
    await store.insertAnalyticsEvent(
      analyticsEvent({
        kind: AnalyticsEventKind.CLICK,
        path: "/a",
        durationSeconds: 100,
        eventName: "cta_clicked",
        country: "US",
      }),
      "2026-10-01T02:00:00.000Z",
    );
    await store.insertAnalyticsEvent(
      analyticsEvent({ path: "/c", durationSeconds: 50, country: "US" }),
      "2026-09-30T23:59:59.000Z",
    );
    await store.insertAnalyticsEvent(
      analyticsEvent({ path: "/d", durationSeconds: 50, country: "US" }),
      "2026-10-01T03:00:00.001Z",
    );

    const summary = await store.summarizeAnalytics(summaryQuery({ from, to }), modulesOff);

    expect(summary.totalViews).toBe(3);
    expect(summary.averageDurationSeconds).toBe(10.5);
    expect(summary.byPath).toEqual([
      { path: "/a", views: 2, averageDurationSeconds: 10.5 },
      { path: "/b", views: 1, averageDurationSeconds: 0 },
    ]);
    expect(summary).not.toHaveProperty("byCountry");
    expect(summary).not.toHaveProperty("byCity");
    expect(summary).not.toHaveProperty("sessions");
    expect(summary).not.toHaveProperty("events");
    expect(summary).not.toHaveProperty("byEventName");

    const byPath = await store.summarizeAnalytics(
      summaryQuery({ from, to, path: "/a" }),
      modulesOff,
    );
    expect(byPath.totalViews).toBe(2);
    expect(byPath.byPath).toEqual([{ path: "/a", views: 2, averageDurationSeconds: 10.5 }]);

    const byCountry = await store.summarizeAnalytics(
      summaryQuery({ from, to, country: "DE" }),
      modulesOff,
    );
    expect(byCountry.totalViews).toBe(1);
    expect(byCountry.averageDurationSeconds).toBe(0);
    expect(byCountry.byPath).toEqual([{ path: "/b", views: 1, averageDurationSeconds: 0 }]);

    const bySession = await store.summarizeAnalytics(
      summaryQuery({ from, to, sessionId: "sess-1" }),
      modulesOff,
    );
    expect(bySession.totalViews).toBe(2);
    expect(bySession).not.toHaveProperty("events");
    expect(bySession).not.toHaveProperty("sessions");
  });

  it("summary includes byCountry, byCity, sessions, and byEventName only when that module is on", async () => {
    const store = new MemoryAnalyticsEventStore(modulesOn);
    const t0 = "2026-10-01T00:00:00.000Z";
    const t1 = "2026-10-01T01:00:00.000Z";
    const t2 = "2026-10-01T02:00:00.000Z";
    const t3 = "2026-10-01T03:00:00.000Z";
    const t4 = "2026-10-01T04:00:00.000Z";
    const t5 = "2026-10-01T05:00:00.000Z";
    const query = summaryQuery({ from: t0, to: t5 });

    const viewPricing = await store.insertAnalyticsEvent(
      analyticsEvent({
        path: "/pricing",
        durationSeconds: 10,
        country: "US",
        city: "Austin",
        sessionId: "sess-1",
      }),
      t1,
    );
    const clickEarly = await store.insertAnalyticsEvent(
      analyticsEvent({
        kind: AnalyticsEventKind.CLICK,
        path: "/pricing",
        country: "US",
        city: "Austin",
        sessionId: "sess-1",
        eventName: "cta_clicked",
      }),
      t0,
    );
    const viewDocs = await store.insertAnalyticsEvent(
      analyticsEvent({
        path: "/docs",
        durationSeconds: 30,
        country: "US",
        city: "Austin",
        sessionId: "sess-1",
      }),
      t2,
    );
    await store.insertAnalyticsEvent(
      analyticsEvent({
        path: "/pricing",
        durationSeconds: null,
        country: "DE",
        city: "Berlin",
        sessionId: "sess-2",
      }),
      t3,
    );
    await store.insertAnalyticsEvent(
      analyticsEvent({
        kind: AnalyticsEventKind.CLICK,
        path: "/docs",
        country: "DE",
        city: "Berlin",
        sessionId: "sess-2",
        eventName: "signup",
      }),
      t4,
    );
    const clickSignup = await store.insertAnalyticsEvent(
      analyticsEvent({
        kind: AnalyticsEventKind.CLICK,
        path: "/pricing",
        country: "US",
        city: "Austin",
        sessionId: "sess-1",
        eventName: "signup",
      }),
      t5,
    );

    const byCountry = [
      { country: "DE", views: 1 },
      { country: "US", views: 2 },
    ];
    const byCity = [
      { city: "Austin", views: 2 },
      { city: "Berlin", views: 1 },
    ];
    const sessions = [
      { id: "sess-1", startedAt: t0, pageCount: 2 },
      { id: "sess-2", startedAt: t3, pageCount: 1 },
    ];
    const byEventName = [
      { eventName: "cta_clicked", count: 1 },
      { eventName: "signup", count: 2 },
    ];
    const optionalKeys = ["byCountry", "byCity", "sessions", "events", "byEventName"] as const;

    const allOff = await store.summarizeAnalytics(query, modulesOff);
    expect(allOff.totalViews).toBe(3);
    expect(allOff.averageDurationSeconds).toBe(20);
    expect(allOff.byPath).toEqual([
      { path: "/docs", views: 1, averageDurationSeconds: 30 },
      { path: "/pricing", views: 2, averageDurationSeconds: 10 },
    ]);
    for (const key of optionalKeys) {
      expect(allOff).not.toHaveProperty(key);
    }

    const countryOnly = await store.summarizeAnalytics(query, { ...modulesOff, country: true });
    expect(countryOnly.byCountry).toEqual(byCountry);
    expect(countryOnly).not.toHaveProperty("byCity");
    expect(countryOnly).not.toHaveProperty("sessions");
    expect(countryOnly).not.toHaveProperty("events");
    expect(countryOnly).not.toHaveProperty("byEventName");

    const cityOnly = await store.summarizeAnalytics(query, { ...modulesOff, city: true });
    expect(cityOnly.byCity).toEqual(byCity);
    expect(cityOnly).not.toHaveProperty("byCountry");
    expect(cityOnly).not.toHaveProperty("sessions");
    expect(cityOnly).not.toHaveProperty("events");
    expect(cityOnly).not.toHaveProperty("byEventName");

    const sessionsOnly = await store.summarizeAnalytics(query, { ...modulesOff, sessions: true });
    expect(sessionsOnly.sessions).toEqual(sessions);
    expect(sessionsOnly).not.toHaveProperty("events");
    expect(sessionsOnly).not.toHaveProperty("byCountry");
    expect(sessionsOnly).not.toHaveProperty("byCity");
    expect(sessionsOnly).not.toHaveProperty("byEventName");

    const clicksOnly = await store.summarizeAnalytics(query, { ...modulesOff, clicks: true });
    expect(clicksOnly.byEventName).toEqual(byEventName);
    expect(clicksOnly).not.toHaveProperty("byCountry");
    expect(clicksOnly).not.toHaveProperty("byCity");
    expect(clicksOnly).not.toHaveProperty("sessions");
    expect(clicksOnly).not.toHaveProperty("events");

    const allOn = await store.summarizeAnalytics(query, modulesOn);
    expect(allOn.byCountry).toEqual(byCountry);
    expect(allOn.byCity).toEqual(byCity);
    expect(allOn.sessions).toEqual(sessions);
    expect(allOn.byEventName).toEqual(byEventName);
    expect(allOn).not.toHaveProperty("events");

    const trail = await store.summarizeAnalytics(
      { ...query, sessionId: "sess-1" },
      { ...modulesOff, sessions: true },
    );
    expect(trail.sessions).toEqual([{ id: "sess-1", startedAt: t0, pageCount: 2 }]);
    expect(trail.events).toEqual([
      {
        id: clickEarly.id,
        kind: AnalyticsEventKind.CLICK,
        path: "/pricing",
        occurredAt: t0,
        eventName: "cta_clicked",
      },
      {
        id: viewPricing.id,
        kind: AnalyticsEventKind.VIEW,
        path: "/pricing",
        occurredAt: t1,
        eventName: null,
      },
      {
        id: viewDocs.id,
        kind: AnalyticsEventKind.VIEW,
        path: "/docs",
        occurredAt: t2,
        eventName: null,
      },
      {
        id: clickSignup.id,
        kind: AnalyticsEventKind.CLICK,
        path: "/pricing",
        occurredAt: t5,
        eventName: "signup",
      },
    ]);
    expect(trail).not.toHaveProperty("byCountry");
    expect(trail).not.toHaveProperty("byCity");
    expect(trail).not.toHaveProperty("byEventName");

    const trailWithoutSessions = await store.summarizeAnalytics(
      { ...query, sessionId: "sess-1" },
      modulesOff,
    );
    expect(trailWithoutSessions.totalViews).toBe(2);
    expect(trailWithoutSessions).not.toHaveProperty("events");
    expect(trailWithoutSessions).not.toHaveProperty("sessions");
  });
});
