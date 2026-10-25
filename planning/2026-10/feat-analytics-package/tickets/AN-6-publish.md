---
key: AN-6
type: task
title: Publish the private package
epic: AN
units: [repo]
depends_on: [AN-3, AN-4, AN-5]
---

## Summary

The SDK is installed by the sites that need it. This ticket publishes it as a private package. The browser script, the server function, Postgres, and the Payload adapter are all in that one package.

The npm organization scope is not chosen yet. Publishing waits on that name.

Links: RFC "Decisions" 11, "Rollout", "Risks and open questions".

## Scope

- **In:** the scoped package name, `publishConfig`, the publish workflow, and the README a site follows.
- **Out:** a public npm release. Installing the package into this site. A consent banner.

## Acceptance criteria

- **AC1:** Given the scope from the gate, when the package is published, then `npm view` shows access restricted and the version just built.
- **AC2:** Given the README, when a reader follows it, then it shows `startAnalytics` for the browser, `recordAnalyticsEvent` for Express and Nest, the Postgres `CREATE TABLE`, and `analyticsPlugin` for Payload, including the site-owned migration.
- **AC3:** Given the published tarball, when its file list is inspected, then `playground/` is not in it.

## Tests (write these first)

| Test | Level | Unit | Covers |
|---|---|---|---|
| `pnpm pack --dry-run` file list excludes `playground` | unit | repo | AC3 |
| README contains the four install headings: browser, Express, Nest, Payload | unit | repo | AC2 |

AC1 is checked against the registry after publish, not in Vitest.

## Solution design

> For the implementing agent. Not copied to the tracker.

### Unit: repo (~6 files)

**Files:** `package.json` (edit), `README.md` (edit), `.github/workflows/publish.yml` (new), `src/payload/analytics-plugin.ts` (edit, component paths), `src/publish-files.test.ts` (new), `.npmrc` (new, only if the registry requires it; no token in the file).

**1. Name.** Set `"name"` to `@<scope>/analytics-sdk` using the scope from the gate. `publishConfig.access` is `restricted`. Update the Payload component `path` strings from `analytics-sdk/...` to `@<scope>/analytics-sdk/...`.

**2. README.** Four short sections, with the function names from the RFC and no second set of names:

- Browser: `startAnalytics` after consent, and `data-analytics` for a named click.
- Express and Nest: the `recordAnalyticsEvent` snippet. They are not dependencies.
- Postgres: run `schema.sql` with the application's schema.
- Payload: `analyticsPlugin`, then the site runs its own migration. Do not run `schema.sql` as well. The client endpoint is `/api/analytics/events`. The screen is `/admin/analytics`.

**3. Workflow.** On a git tag `v*`, the workflow builds and runs `npm publish --access restricted`. The registry token is a secret, not a file in the repo.

**4. Pack test.** `pnpm pack --dry-run` output must not list `playground/`.

**Verification:** the pack test and `pnpm test`. AC1 after the tag publish. AC2 is the README test plus reading the four sections.

## Notes

- This unit stays `draft` until the scope gate is filled in.
- **Ask before:** publishing with public access, or publishing before AN-3, AN-4, and AN-5 are done.
