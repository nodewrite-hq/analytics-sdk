---
key: AN-3
type: task
title: Browser script
epic: AN
units: [repo]
depends_on: [AN-2]
---

## Summary

A site starts analytics with one call. The script sends a view when the page loads, another view when the path changes, and the time on the page when the tab hides. Named clicks are sent only for elements that carry `data-analytics`, or for an explicit `recordNamedClick` call.

If analytics is off, the script installs nothing: no timer, no cookie, no listener.

Links: RFC "Client".

## Scope

- **In:** `startAnalytics`, `recordNamedClick`, the session cookie, the request bodies the server will accept.
- **Out:** validating those bodies on the server (AN-4). The script does not read country or city headers.

## Acceptance criteria

- **AC1:** Given `enabled: false`, when `startAnalytics` runs, then no listener is registered and no request is sent.
- **AC2:** Given analytics enabled, when the page loads and then hides, then one view request is sent and one duration request is sent with the id from the view response.
- **AC3:** Given `clicks: false`, when an element with `data-analytics="cta_clicked"` is clicked, then no click request is sent. Given `clicks: true`, when that element is clicked, then one click request is sent and a click on an unmarked element is not.
- **AC4:** Given `sessions: true`, when the script starts, then the cookie `analytics_session` is set and its value is on the view request. Given `sessions: false`, then that cookie is not set.

## Tests (write these first)

| Test | Level | Unit | Covers |
|---|---|---|---|
| `enabled: false` registers no listeners and fetches nothing | unit | repo | AC1 |
| load sends a view; `pagehide` sends duration with the returned id | unit | repo | AC2 |
| `pushState` to a new path sends a second view | unit | repo | AC2 |
| clicks off ignores `data-analytics`; clicks on sends that name only | unit | repo | AC3 |
| `recordNamedClick` sends a click when clicks are on, and nothing when they are off | unit | repo | AC3 |
| sessions on writes `analytics_session`; sessions off does not | unit | repo | AC4 |

## Solution design

> For the implementing agent. Not copied to the tracker.

### Unit: repo (~7 files)

**Files:** `src/client/analytics-client-config.ts` (new), `src/client/session-cookie.ts` (new), `src/client/start-analytics.ts` (new), `src/client/record-named-click.ts` (new), `src/client/start-analytics.test.ts` (new), `src/client/index.ts` (edit), `vitest.config.ts` (edit, jsdom for this test).

**1. Config.** `AnalyticsClientConfig` is the client interface in the RFC "Critical code" section.

**2. Request body.** Import `AnalyticsEventBody` from `src/analytics-event-body.ts` (AN-2). Do not define a second body.

**3. `startAnalytics`.** When `enabled` is false, return. Otherwise:

- Read or create `analytics_session` only when `sessions` is true. `SameSite=Lax`, path `/`, one year. The script sets `document.cookie`. The value is not an auth token.
- POST a `view` body to `config.endpoint` on load. Keep the returned `{ id }`.
- Wrap `history.pushState` and `history.replaceState`, and listen for `popstate`. On a path change, send a duration for the previous id, then a new view.
- On `pagehide`, `navigator.sendBeacon` the duration. Cap the seconds at 1800 before sending. Duration is the time since the current view was sent.
- When `clicks` is true, one click listener on `document` handles only `event.target` closest to `[data-analytics]`. The attribute value must match `^[a-z0-9_]+$` or the click is ignored.
- `recordNamedClick(name)` uses the same click body. It no-ops when clicks are off or the name fails the pattern.

The path sent is `location.pathname` only. Query strings are not sent.

**4. Exports** from `src/client/index.ts`: `startAnalytics`, `recordNamedClick`, `AnalyticsClientConfig`, `AnalyticsEventBody`.

**Verification:** `pnpm test` with jsdom for the client test. AC1 → enabled false. AC2 → load, hide, and pushState. AC3 → click tests. AC4 → cookie test.

## Notes

- The client entry must not import `src/server`, `src/postgres`, or `src/payload`.
- **Ask before:** listening to every click, or storing the session id as `HttpOnly` (that would require every server framework to set the cookie).
