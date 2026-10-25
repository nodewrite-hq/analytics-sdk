import { describe, expect, it } from "vitest";
import type { Payload } from "payload";
import { AnalyticsEventKind } from "../core/event-kind.js";
import type { AnalyticsModules } from "../core/options.js";
import type { NewAnalyticsEvent, StoredAnalyticsEvent } from "../core/event.js";
import type { AnalyticsSummaryQuery } from "../core/summary.js";
import { summarizeAnalyticsEvents } from "../core/summarize-events.js";
import { PayloadAnalyticsEventStore } from "./store.js";

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

const query: AnalyticsSummaryQuery = {
  from: "2026-10-01T00:00:00.000Z",
  to: "2026-10-01T03:00:00.000Z",
  country: "US",
  path: "/pricing",
  sessionId: "sess-1",
};

interface CreateArgs {
  collection: string;
  data: Record<string, unknown>;
  overrideAccess?: boolean;
}

interface UpdateArgs {
  collection: string;
  where: unknown;
  data: Record<string, unknown>;
  overrideAccess?: boolean;
}

interface FindArgs {
  collection: string;
  where: unknown;
  pagination?: boolean;
  overrideAccess?: boolean;
}

function event(overrides: Partial<NewAnalyticsEvent> = {}): NewAnalyticsEvent {
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

function fakePayload(docs: unknown[]) {
  const creates: CreateArgs[] = [];
  const updates: UpdateArgs[] = [];
  const finds: FindArgs[] = [];
  const payload = {
    async create(args: CreateArgs) {
      creates.push(args);
      return { id: "row-1", ...args.data };
    },
    async update(args: UpdateArgs) {
      updates.push(args);
      return { docs: [] };
    },
    async find(args: FindArgs) {
      finds.push(args);
      return { docs };
    },
  } as unknown as Payload;
  return { payload, creates, updates, finds };
}

describe("PayloadAnalyticsEventStore", () => {
  it("inserts and updates with overrideAccess, and drops fields for modules that are off", async () => {
    const { payload, creates, updates } = fakePayload([]);
    const store = new PayloadAnalyticsEventStore(payload, modulesOff);

    const stored = await store.insertAnalyticsEvent(
      event({ durationSeconds: 12, eventName: "cta_clicked" }),
      "2026-10-01T00:00:00.000Z",
    );

    expect(creates[0]).toMatchObject({
      collection: "analytics-events",
      overrideAccess: true,
      data: {
        country: null,
        city: null,
        sessionId: null,
        eventName: null,
        path: "/pricing",
      },
    });
    expect(stored.id).toBe("row-1");
    expect(stored.country).toBeNull();

    await store.recordAnalyticsDuration("row-1", 1801);
    expect(updates).toHaveLength(0);

    await store.recordAnalyticsDuration("row-1", 9);
    expect(updates[0]).toMatchObject({
      collection: "analytics-events",
      overrideAccess: true,
      data: { durationSeconds: 9 },
      where: {
        and: [{ id: { equals: "row-1" } }, { kind: { equals: AnalyticsEventKind.VIEW } }],
      },
    });
  });

  it("loads the filtered range and groups it with summarizeAnalyticsEvents", async () => {
    const docs = [
      {
        id: "a",
        kind: "view",
        path: "/pricing",
        locale: "en",
        occurredAt: "2026-10-01T00:00:00.000Z",
        durationSeconds: 10,
        country: "US",
        city: "Austin",
        sessionId: "sess-1",
        eventName: null,
      },
      {
        id: "b",
        kind: "view",
        path: "/pricing",
        locale: null,
        occurredAt: "2026-10-01T01:00:00.000Z",
        durationSeconds: 20,
        country: "US",
        city: null,
        sessionId: "sess-1",
        eventName: null,
      },
    ];
    const { payload, finds } = fakePayload(docs);
    const store = new PayloadAnalyticsEventStore(payload, modulesOn);
    const openQuery: AnalyticsSummaryQuery = {
      ...query,
      country: null,
      path: null,
      sessionId: null,
    };

    const summary = await store.summarizeAnalytics(query, modulesOn);
    const rows: StoredAnalyticsEvent[] = docs.map((doc) => ({
      id: doc.id,
      kind: AnalyticsEventKind.VIEW,
      path: doc.path,
      locale: doc.locale,
      occurredAt: doc.occurredAt,
      durationSeconds: doc.durationSeconds,
      country: doc.country,
      city: doc.city,
      sessionId: doc.sessionId,
      eventName: doc.eventName,
    }));

    expect(finds[0]).toMatchObject({
      collection: "analytics-events",
      pagination: false,
      overrideAccess: true,
      where: {
        and: [
          { occurredAt: { greater_than_equal: query.from } },
          { occurredAt: { less_than_equal: query.to } },
          { country: { equals: "US" } },
          { path: { equals: "/pricing" } },
          { sessionId: { equals: "sess-1" } },
        ],
      },
    });
    expect(summary).toEqual(summarizeAnalyticsEvents(rows, query, modulesOn));

    await store.summarizeAnalytics(openQuery, modulesOn);
    const openWhere = finds[1]?.where as { and: unknown[] };
    expect(openWhere.and).toEqual([
      { occurredAt: { greater_than_equal: openQuery.from } },
      { occurredAt: { less_than_equal: openQuery.to } },
    ]);
  });
});
