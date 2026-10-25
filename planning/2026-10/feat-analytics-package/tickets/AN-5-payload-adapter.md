---
key: AN-5
type: task
title: Payload adapter and admin screen
epic: AN
units: [repo]
depends_on: [AN-2, AN-4]
---

## Summary

A Payload project can store analytics in the database it already has and show the report inside the admin. The editor opens one prepared screen. They do not build it from blocks, and they do not create rows by hand.

The screen shows totals, paths, and the modules that are on. Country, city, sessions, and named clicks are absent when that flag is off. An anonymous visitor cannot read or create the rows through Payload's API.

Links: RFC "Access", "Editor experience", "Decisions" 5.

## Scope

- **In:** the collection, its access, the ingest endpoint, `analyticsPlugin`, the admin screen at `/admin/analytics`.
- **Out:** applying `schema.sql` in a Payload project (AN-4). A dashboard for Express or Nest. Installing the plugin into this site.

## Acceptance criteria

- **AC1 (editor):** Given an authenticated user and the country module on, when they open `/admin/analytics`, then the screen shows total views, average duration, a path table, and a country table. The date range starts at the last 7 days.
- **AC2 (editor):** Given the city, sessions, and clicks modules off, when they open the screen, then those three sections are not shown.
- **AC3 (editor):** Given sessions are on, when they open a session link, then the screen lists that session's events in time order.
- **AC4:** Given no user, when Payload evaluates access for `analytics-events`, then read, create, update, and delete are denied. Given a user, when they try to create a row in the admin, then create is still denied.

## Tests (write these first)

| Test | Level | Unit | Covers |
|---|---|---|---|
| `read` is false without `req.user` and true with a user; create, update, and delete are false | unit | repo | AC4 |
| the endpoint calls `recordAnalyticsEvent` and does not pass a country from the body | unit | repo | AC4 |
| `adminSections` omits city, sessions, and clicks when those modules are off | unit | repo | AC2 |
| `adminSections` includes the country table when the module is on | unit | repo | AC1 |
| a `session` query includes the ordered trail only when sessions are on | unit | repo | AC3 |

No Payload server is booted in this package. Payload enforces the access functions the tests call.

## Solution design

> For the implementing agent. Not copied to the tracker. Payload in this site is 3.92. Use the types below; do not guess a view prop that is not on them.

### Unit: repo (~12 files)

**Files:** `src/payload/analytics-events-access.ts` (new), `src/payload/analytics-events-access.test.ts` (new), `src/payload/analytics-events-collection.ts` (new), `src/payload/payload-analytics-event-store.ts` (new), `src/payload/analytics-endpoint.ts` (new), `src/payload/analytics-endpoint.test.ts` (new), `src/payload/admin-sections.ts` (new), `src/payload/admin-sections.test.ts` (new), `src/payload/admin-view.tsx` (new), `src/payload/nav-link.tsx` (new), `src/payload/analytics-plugin.ts` (new), `src/payload/index.ts` (edit).

**1. Access** (`analytics-events-access.ts`). `read` returns `Boolean(req.user)` unless the plugin was given a `read` function. `create`, `update`, and `delete` return `false`.

**2. Collection** slug `analytics-events`. `admin.hidden: true`. No versions, no drafts. Fields match the RFC event row: `kind` (select `view` | `click`, required), `path` (text, required, max 2048), `locale` (text, max 35), `occurredAt` (date, required), `durationSeconds` (number, min 0, max 1800), `country` (text, max 2), `city` (text, max 80), `sessionId` (text, max 36), `eventName` (text, max 64). Labels: "Analytics event" / "Analytics events".

**3. Store.** `PayloadAnalyticsEventStore` implements `AnalyticsEventStore` with the Local API. `insertAnalyticsEvent` and `recordAnalyticsDuration` use `overrideAccess: true`. `summarizeAnalytics` uses `payload.find` on the collection with the date range and aggregates in memory with the same grouping rules as the memory store. Extract the grouping from AN-2 into a shared function if the memory store already has it, and call that function here. Do not copy the grouping rules a second time.

**4. Endpoint.** One root endpoint, method `post`, path `/analytics/events`. Payload serves it at `/api/analytics/events`. The handler builds `AnalyticsEventRequest` from `req` and calls `recordAnalyticsEvent`. This is the client `endpoint` a Payload site configures.

**5. Sections** (`admin-sections.ts`). A pure function of `AnalyticsSummary`, the modules, and the query. Returns the blocks the screen renders, in order: totals, paths, countries, cities, named clicks, sessions. A module that is off contributes no block. `session` on the query replaces the list with that session's events in time order when sessions are on.

**6. Admin view.** Installed Payload 3.92 types:

```ts
admin: {
  components: {
    views: {
      analytics: {
        Component: {
          path: 'analytics-sdk/payload/admin-view',
          exportName: 'AnalyticsAdminView',
        },
        path: '/analytics',
      },
    },
    afterNavLinks: [
      {
        path: 'analytics-sdk/payload/nav-link',
        exportName: 'AnalyticsNavLink',
      },
    ],
  },
}
```

`AnalyticsAdminView` receives `AdminViewServerProps` (`initPageResult`, `searchParams`, `payload`, `visibleEntities`). If `initPageResult.req.user` is missing, render nothing. Wrap the sections in `DefaultTemplate` from `@payloadcms/next/templates`, passing `visibleEntities`. Read `from`, `to`, `country`, `path`, and `session` from `searchParams`. Default `from` is seven days before `to`. Labels are English.

`payload` and `@payloadcms/next` are optional peers, imported only from `src/payload/`.

**7. Plugin.**

```ts
export function analyticsPlugin(
  options: AnalyticsServerOptions & { read?: Access },
): (config: Config) => Config
```

It appends the collection, the endpoint, the view, and the nav link. It does not remove existing collections or views.

**Verification:** `pnpm test` in `analytics-sdk`. AC1 and AC2 → `adminSections` tests. AC3 → the session query test. AC4 → the access tests. The screen itself is reviewed when a Payload site installs the plugin, which is out of scope here.

## Notes

- AN-6 changes the component path strings if the package name gains a scope.
- **Ask before:** shipping a Payload migration inside this package. The site generates its own.
