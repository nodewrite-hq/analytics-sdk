---
key: AN-1
type: task
title: Create the analytics-sdk package
epic: AN
units: [repo]
depends_on: []
---

## Summary

The analytics SDK does not exist yet. This ticket creates it as its own folder, next to this site, with its own git history. Nothing in this site's `src/` changes.

The folder can be built and tested before any event code exists. Five entry points are reserved: the core, the browser script, the server function, Postgres, and Payload. Only the Payload entry is allowed to import Payload later.

Links: RFC "Where the work runs", "Decisions" 1 and 12.

## Scope

- **In:** the sibling folder `analytics-sdk`, git, TypeScript, Vitest, the build, the five entries, the import boundary test.
- **Out:** event types (AN-2), the browser script (AN-3), ingest and Postgres (AN-4), the Payload plugin (AN-5), npm publish (AN-6).

## Acceptance criteria

- **AC1:** Given this site's repository, when AN-1 is done, then `src/` has no analytics SDK source. The SDK is a sibling directory named `analytics-sdk`.
- **AC2:** Given that directory, when `pnpm test` and `pnpm typecheck` run, then both pass.
- **AC3:** Given the core, client, server, and Postgres source, when the boundary test runs, then a file that imports `payload` fails the test. The same import under `src/payload/` passes.

## Tests (write these first)

| Test | Level | Unit | Covers |
|---|---|---|---|
| core, client, server, and postgres source do not import `payload` | unit | repo | AC3 |
| a fixture under `src/payload/` may import `payload` | unit | repo | AC3 |

## Solution design

> For the implementing agent. Not copied to the tracker. Work in the sibling repo, not in this site.

### Unit: repo (~12 files)

**Files:** `analytics-sdk/package.json` (new), `analytics-sdk/tsconfig.json` (new), `analytics-sdk/tsup.config.ts` (new), `analytics-sdk/vitest.config.ts` (new), `analytics-sdk/src/index.ts` (new), `analytics-sdk/src/client/index.ts` (new), `analytics-sdk/src/server/index.ts` (new), `analytics-sdk/src/postgres/index.ts` (new), `analytics-sdk/src/payload/index.ts` (new), `analytics-sdk/src/entries.test.ts` (new), `analytics-sdk/.gitignore` (new), `analytics-sdk/README.md` (new).

**1. Create the folder.** If `../analytics-sdk` (the parent of this site) already exists and is not empty, stop and ask. `git init` with branch `main`. Do not push. Package manager is pnpm. `"name": "analytics-sdk"` with no scope. `"type": "module"`. TypeScript strict, `noUncheckedIndexedAccess`, no `any`.

**2. Entries.** Each of `src/index.ts`, `src/client/index.ts`, `src/server/index.ts`, `src/postgres/index.ts`, and `src/payload/index.ts` is `export {}` until a later ticket fills it.

`package.json` exports map those five paths to the built files:

```json
{
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./client": { "types": "./dist/client/index.d.ts", "import": "./dist/client/index.js" },
    "./server": { "types": "./dist/server/index.d.ts", "import": "./dist/server/index.js" },
    "./postgres": { "types": "./dist/postgres/index.d.ts", "import": "./dist/postgres/index.js" },
    "./payload": { "types": "./dist/payload/index.d.ts", "import": "./dist/payload/index.js" }
  }
}
```

`payload` and `pg` are optional peer dependencies. They are not dependencies of the package. tsup builds the five entries into `dist/`. Scripts: `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `build` (`tsup`).

**3. Boundary test** (`src/entries.test.ts`). Read the source of `src/index.ts`, `src/client/**`, `src/server/**`, and `src/postgres/**`. Fail if any file matches `from 'payload'` or `from "payload"`. A second case writes a temp fixture only in memory, or asserts the allow-list: `src/payload/**` is the only tree excluded from that scan.

**Verification:** in `analytics-sdk`, `pnpm typecheck` and `pnpm test`. AC1 is the directory check. AC2 is those two commands. AC3 is the boundary test.

## Notes

- Do not add a workspace member inside this site.
- **Ask before:** choosing a directory other than the sibling `analytics-sdk`.
