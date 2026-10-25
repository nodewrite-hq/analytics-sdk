# Progress: feat-analytics-package (epic AN)

Release branch: `release/AN-analytics-sdk` in the sibling repo `analytics-sdk` (next to this site). Not a branch of this site.
Review mode: solo
Review per unit: AN-2, AN-4

## Status

- **Stage:** ticketed
- **Done:** 5 of 6 units
- **Current:** AN-6 (implemented, not published)
- **Waiting on:** restricted publish of AN-6
- **Updated:** 2026-10-25

## Plan

| Order | Ticket | Unit | Title | Depends on | Status | Branch | Commit |
|---|---|---|---|---|---|---|---|
| 1 | AN-1 | repo | Create the analytics-sdk package | - | done | | |
| 2 | AN-2 | repo | Event row and in-memory store | AN-1 | done | | |
| 3 | AN-3 | repo | Browser script | AN-2 | done | | |
| 4 | AN-4 | repo | Server ingest, Postgres, and playground | AN-2 | done | | |
| 5 | AN-5 | repo | Payload adapter and admin screen | AN-2, AN-4 | done | | |
| 6 | AN-6 | repo | Publish the private package | AN-3, AN-4, AN-5 | implemented, not published | | |

AN-3 and AN-4 can be built in parallel after AN-2. AN-5 also depends on AN-2. The plan lists AN-4 before AN-5 because the admin screen calls `recordAnalyticsEvent`.

## Gates

- [ ] Tickets approved — before delivery
- [x] npm scope — before AN-6

## Log

- 2026-10-25 RFC approved and six tickets written. Implementation is the sibling `analytics-sdk` repo, not this site.
