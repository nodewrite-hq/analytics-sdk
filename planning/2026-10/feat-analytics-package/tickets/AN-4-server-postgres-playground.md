---
key: AN-4
type: task
title: Server ingest, Postgres, and playground
epic: AN
units: [repo]
depends_on: [AN-2]
---

## Summary

Any Node server can accept an analytics event by calling one function. Express and Nest pass their request body and headers in. The function checks the flags, ignores a country sent by the browser, and writes through the store.

Postgres is the first durable store. A playground in the same folder serves one HTML page and a Node process, so the script and the database can be run without Payload and without this site.

Links: RFC "How an application mounts it", "Critical code".

## Scope

- **In:** `recordAnalyticsEvent`, `readVercelCountryAndCity`, the Postgres store and its `CREATE TABLE`, the playground.
- **Out:** the browser behavior (AN-3). The Payload endpoint (AN-5). Do not run the SQL and the Payload collection against the same database.

## Acceptance criteria

- **AC1:** Given `enabled: false`, when `recordAnalyticsEvent` is called, then nothing is written and the status is 204.
- **AC2:** Given a body that includes a country, when the request is recorded, then that country is discarded. Given `readVercelCountryAndCity` and the country module on, when the header is `DE`, then the stored country is `DE`.
- **AC3:** Given the Postgres store and the schema applied to a test database, when a view is inserted and summarized, then the total includes that view.
- **AC4:** Given the playground is running, when its page is opened, then a view row exists. When the page hides, then that row has a duration.

## Tests (write these first)

| Test | Level | Unit | Covers |
|---|---|---|---|
| `enabled: false` writes nothing and returns 204 | unit | repo | AC1 |
| a country in the body is ignored | unit | repo | AC2 |
| the Vercel header is stored only when the country module is on; the city header only when city is on | unit | repo | AC2 |
| a click is dropped when clicks are off; a session id is dropped when sessions are off | unit | repo | AC2 |
| path must start with `/` and must not contain a scheme; the query string is stripped | unit | repo | AC2 |
| `eventName` must match `^[a-z0-9_]+$` | unit | repo | AC2 |
| Postgres insert and summary against a test database | integration | repo | AC3 |

The playground check (AC4) is manual: open the page, then read the row. There is no Playwright suite.

## Solution design

> For the implementing agent. Not copied to the tracker.

### Unit: repo (~14 files)

**Files:** `src/server/record-analytics-event.ts` (new), `src/server/record-analytics-event.test.ts` (new), `src/server/read-vercel-country-and-city.ts` (new), `src/server/read-vercel-country-and-city.test.ts` (new), `src/server/index.ts` (edit), `src/postgres/schema.sql` (new), `src/postgres/postgres-analytics-event-store.ts` (new), `src/postgres/postgres-analytics-event-store.test.ts` (new), `src/postgres/index.ts` (edit), `playground/package.json` (new), `playground/server.ts` (new), `playground/index.html` (new), `package.json` (edit, workspace). Import `AnalyticsEventBody` from `src/analytics-event-body.ts`. Do not define it again.

**1. `recordAnalyticsEvent`.** Signatures are `RecordAnalyticsEventDeps` and `AnalyticsEventRequest` in the RFC "Critical code" section. The body type is `AnalyticsEventBody` from AN-2. Return `{ status, body }`.

- `enabled: false` → `{ status: 204, body: null }` and no store call.
- `type: 'view'` validates `path`, calls `readCountryAndCity` when present, forces country and city to null when that module is off, forces `sessionId` to null when sessions are off, then `insertAnalyticsEvent`. Response body is `{ id }`. `occurredAt` comes from `deps.now` or the server clock.
- `type: 'duration'` calls `recordAnalyticsDuration`. Status 204.
- `type: 'click'` is dropped when clicks are off. Otherwise it inserts a click row. `eventName` must match `^[a-z0-9_]+$`.

`path` must start with `/`, must not contain `://`, and is stored without a query string.

**2. `readVercelCountryAndCity`.** Reads `x-vercel-ip-country` and `x-vercel-ip-city` from the header bag. Missing headers return null. It does not read or store an IP.

**3. Postgres.** `pg` is an optional peer, imported only from `src/postgres/`. Table `analytics_event` with the columns from the RFC event row, plus `id` (uuid primary key). `schema.sql` is the `CREATE TABLE`. `PostgresAnalyticsEventStore` takes a `pg.Pool` and the modules. The integration test uses `DATABASE_URL` and skips when it is unset, so the default `pnpm test` stays green without a database. Document the env var in the playground README section of `playground/package.json` description, not a second markdown file.

**4. Playground.** Root `package.json` workspaces include `playground`. The playground depends on `analytics-sdk` via `workspace:*`. `server.ts` listens on port 4317, serves `index.html`, and `POST /analytics/events` calls `recordAnalyticsEvent` with the Postgres store when `DATABASE_URL` is set, otherwise the memory store. The page calls `startAnalytics({ endpoint: '/analytics/events', enabled: true, sessions: true, clicks: true })` and has one button with `data-analytics="cta_clicked"`. The playground is not part of the published `files` list.

Express and Nest are not dependencies. The README stub gains the Express snippet from the RFC, with `recordAnalyticsEvent` and `readVercelCountryAndCity` as the names.

**Verification:** `pnpm test`. AC1 and AC2 → the record tests. AC3 → the Postgres test when `DATABASE_URL` is set. AC4 → run the playground and open `http://localhost:4317`.

## Notes

- Payload's table name will differ. A Payload project uses AN-5 instead of this SQL.
- **Ask before:** adding Express, Nest, or Payload as a dependency of this ticket.
