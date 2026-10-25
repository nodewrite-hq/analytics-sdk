---
key: AN-2
type: task
title: Event row and in-memory store
epic: AN
units: [repo]
depends_on: [AN-1]
---

## Summary

The SDK needs one event shape and one place to store it, before any browser or database exists. A view and a named click share that shape. Country, city, session, and click name are present on the row and stay empty when that module is off.

Tests use an in-memory store. Later tickets implement the same store with Postgres and with Payload. They must not invent a second row.

Links: RFC "Event row", "Critical code".

## Scope

- **In:** the event kind, the module flags, the row, the summary, `AnalyticsEventStore`, and the in-memory implementation.
- **Out:** the browser (AN-3), HTTP ingest (AN-4), SQL (AN-4), the admin screen (AN-5).

## Acceptance criteria

- **AC1:** Given modules with country, city, sessions, and clicks off, when a view is inserted, then those four fields are null on the stored row.
- **AC2:** Given a duration below 0 or above 1800, when it is recorded, then the stored duration does not change.
- **AC3:** Given three views for two paths, when the summary is requested for that range, then the total is 3 and the path groups match the rows. With country off, the summary has no `byCountry`.

## Tests (write these first)

| Test | Level | Unit | Covers |
|---|---|---|---|
| disabled modules store null country, city, session id, and event name | unit | repo | AC1 |
| duration below 0 or above 1800 is ignored; a click id is ignored | unit | repo | AC2 |
| summary totals and path groups; `byCountry` absent when the module is off | unit | repo | AC3 |
| summary includes `byCountry`, `byCity`, `sessions`, and `byEventName` only when that module is on | unit | repo | AC3 |

## Solution design

> For the implementing agent. Not copied to the tracker.

### Unit: repo (~11 files)

**Files:** `src/analytics-event-kind.ts` (new), `src/analytics-modules.ts` (new), `src/analytics-event.ts` (new), `src/analytics-event-body.ts` (new), `src/analytics-summary.ts` (new), `src/analytics-event-store.ts` (new), `src/duration-seconds.ts` (new), `src/memory-analytics-event-store.ts` (new), `src/memory-analytics-event-store.test.ts` (new), `src/index.ts` (edit), `src/duration-seconds.test.ts` (new).

**1. Types.** Use the interfaces in the RFC "Critical code" section. Do not paste a second set of names. `AnalyticsEventKind` is a const object, not an enum. Export them from `src/index.ts`.

`src/analytics-event-body.ts` is the request body AN-3 sends and AN-4 accepts. One definition:

```ts
export type AnalyticsEventBody =
  | { type: 'view'; path: string; locale: string | null; sessionId: string | null }
  | { type: 'duration'; id: string; durationSeconds: number }
  | { type: 'click'; path: string; locale: string | null; sessionId: string | null; eventName: string }
```

**2. Duration** (`src/duration-seconds.ts`). `acceptDurationSeconds(value: number): number | null` returns the value when it is from 0 to 1800 inclusive, otherwise null.

**3. Memory store** (`src/memory-analytics-event-store.ts`). Implements `AnalyticsEventStore`.

- `insertAnalyticsEvent` copies the event, then sets `country`, `city`, `sessionId`, and `eventName` to null when the matching module is off. `occurredAt` is the argument, not the caller's clock inside the store. The id is a random UUID.
- `recordAnalyticsDuration` no-ops when the id is missing, the row is not a view, or `acceptDurationSeconds` returns null.
- `summarizeAnalytics` keeps rows with `occurredAt` inside `from` and `to`, then filters by `country`, `path`, and `sessionId` when those query fields are non-null. Omit `byCountry`, `byCity`, `sessions`, and `byEventName` when the module is off. A session group is id, `startedAt` (earliest `occurredAt`), and the count of view rows.

The summary type is `AnalyticsSummary` in `src/analytics-summary.ts`: `totalViews`, `averageDurationSeconds`, `byPath`, and the optional groups above.

**Verification:** `pnpm test` in `analytics-sdk`. AC1 → "disabled modules". AC2 → duration test. AC3 → summary test.

## Notes

- The in-memory store receives modules on construction: `new MemoryAnalyticsEventStore(modules)`.
- **Ask before:** adding a second event table or renaming a field from the RFC.
