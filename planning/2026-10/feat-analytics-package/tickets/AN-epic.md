---
key: AN
type: task
title: Analytics SDK
epic: AN
units: [repo]
depends_on: []
---

## Summary

Three sites need the same visitor analytics, with different modules turned on. Views and time on the page are the base. Country, city, a session trail, and named clicks are optional. The rows live in the project's own database.

The product is `@<scope>/analytics-sdk`, built in its own folder beside this site. A browser script starts from a config. A server function accepts events and writes them through a store. Postgres is the first store. Payload is an optional adapter that adds an admin screen. A project that does not install that adapter never loads Payload.

Links: RFC "Analytics SDK".

## Scope

- **In:** the empty package folder, the core, the client script, the server function, the Postgres store, the playground, the Payload adapter, and private npm publish.
- **Out:** installing the package into this site or any client site. Staff audit logs, leads, and revenue. Session replay. A consent banner. A retention job.

## Acceptance criteria

- **AC1:** Given the package folder, when its tests run, then the core, client, server, and Postgres entries do not import `payload`.
- **AC2:** Given the playground, when a page loads, then one view row is stored and a later hide stores a duration.
- **AC3:** Given a Payload project that adds the plugin, when an authenticated editor opens `/admin/analytics`, then the screen shows totals for the enabled modules and hides the rest.
- **AC4:** Given an anonymous request, when it lists or creates `analytics-events` through Payload's REST API, then Payload refuses.

## Tickets

| Order | Ticket | Depends on | Delivers |
|---|---|---|---|
| 1 | AN-1 | - | The empty package repo and its build |
| 2 | AN-2 | AN-1 | The event row, the store port, the in-memory store |
| 3 | AN-3 | AN-2 | The browser script |
| 4 | AN-4 | AN-2 | `recordAnalyticsEvent`, Postgres, the playground |
| 5 | AN-5 | AN-2, AN-4 | The Payload adapter and the admin screen |
| 6 | AN-6 | AN-3, AN-4, AN-5 | Private npm publish |
