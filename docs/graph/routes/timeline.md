---
type: route
source: apps/api/src/routes/timeline.ts
---

# Route: Timeline

**Type:** API Route Handler  
**Source:** `apps/api/src/routes/timeline.ts`

## Responsibility
Returns a narrative timeline of completed chapters by joining chapter records with their AI-generated summaries, enabling a compact chapter-by-chapter story history view.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stories/:storyId/timeline` | Returns completed/paused chapters joined with `chapterSummaries`, ordered by chapter number desc |

## Inputs
- **`StoryParam`** — `{ storyId: UUID }`
- No request body

## Outputs
- `{ timeline: Array<{ number, title, summary, completedAt }> }` — only chapters with status `completed` or `paused_pending_updates` that have a linked summary row

## Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; inner-joins `chapters` with `chapterSummaries` filtered by completion status

## Used by
- [[app-web]] — story timeline / reading history panel
- [[app-api]] — registered here

## Related database tables
- [[database/tables/chapters]]
- [[database/tables/chapter-summaries]]

## Related flows
- [[flows/chapter-generation-flow]] — `SummaryCompactor` writes to `chapterSummaries` after each chapter; this route reads those records

## Related domain concepts
- Chapter summaries (compact narrative summaries written by `SummaryCompactor` during the memory step)
- Completion states: only `completed` and `paused_pending_updates` chapters appear in the timeline
- Inner join semantics — chapters without a summary row are excluded from results
