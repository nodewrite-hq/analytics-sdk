# @nodewrite-labs/analytics-sdk

Records page views and named clicks. The browser sends an event. The server checks it and writes it through a store. Country and city come from the caller. A value on the JSON body is ignored.

`payload` and `pg` are optional peer dependencies. Install one only when that entry is used.

## Entries

| Import                              | What it exports                                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `@nodewrite-labs/analytics-sdk`          | Event types, module flags, `AnalyticsEventStore`, `MemoryAnalyticsEventStore`, `summarizeAnalyticsEvents` |
| `@nodewrite-labs/analytics-sdk/client`   | `startAnalytics`, `recordNamedClick`                                                                      |
| `@nodewrite-labs/analytics-sdk/server`   | `recordAnalyticsEvent`, `readRequestGeo`                                                                  |
| `@nodewrite-labs/analytics-sdk/postgres` | `PostgresAnalyticsEventStore`, `schema.sql`                                                               |
| `@nodewrite-labs/analytics-sdk/payload`  | Payload collection, ingest, and admin screen                                                              |

## Events

A view is `{ type: "view", path, locale, sessionId }`.

A duration is `{ type: "duration", id, durationSeconds }`. A duration is kept only inside 0..1800 seconds.

A click is `{ type: "click", path, locale, sessionId, eventName }`. `eventName` is lowercase letters, digits, and underscores.

`path` starts with `/`. The query string is removed before the row is stored.

## Modules

`country`, `city`, `sessions`, and `clicks`. A module that is off stores null for its field. The summary omits that breakdown.

## Browser

Call `startAnalytics` after the visitor has consented. `enabled: false` sends nothing.

```ts
import { startAnalytics } from "@nodewrite-labs/analytics-sdk/client";

startAnalytics({
  endpoint: "/analytics/events",
  enabled: true,
  locale: "en",
  sessions: true,
  clicks: true,
});
```

A named click is an element with `data-analytics`. The attribute value is the event name. Clicks are sent only when `clicks` is true.

```html
<button type="button" data-analytics="cta_clicked">Continue</button>
```

`recordNamedClick(name)` sends one named click when clicks are on.

## Server

`recordAnalyticsEvent` checks one event and writes it through an `AnalyticsEventStore`.

Pass `{ body, country, city }`, or `{ request, country, city }` when `request` is a Fetch `Request` and `body` is omitted. Country and city are those properties. `readRequestGeo` reads the same two properties.

```ts
import { recordAnalyticsEvent } from "@nodewrite-labs/analytics-sdk/server";

const result = await recordAnalyticsEvent(
  { body, country, city },
  {
    store,
    options: {
      enabled: true,
      modules: { country: true, city: true, sessions: true, clicks: true },
    },
  },
);
```

`enabled: false` writes nothing and returns status 204. A stored view or click returns status 200 and `{ id }`. A recorded duration returns 204. An event that cannot be stored returns 400.

## Store

`AnalyticsEventStore` is three methods: `insertAnalyticsEvent`, `recordAnalyticsDuration`, and `summarizeAnalytics`.

`MemoryAnalyticsEventStore` keeps the rows in memory. `PostgresAnalyticsEventStore` reads and writes `analytics_event`. The SQL shipped with this package is `src/postgres/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS analytics_event (
  id uuid primary key,
  kind text not null,
  path text not null,
  locale text,
  occurred_at timestamptz not null,
  duration_seconds integer,
  country text,
  city text,
  session_id text,
  event_name text
);
```

`applyAnalyticsSchema(pool)` runs that file. `summarizeAnalyticsEvents` groups the stored rows for one time range: total views, average duration, and counts by path. Country, city, sessions, and named clicks are included only when that module is on.
