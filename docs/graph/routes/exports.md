---
type: route
source: apps/api/src/routes/exports.ts
---

# Route: Exports

**Type:** API Route Handler  
**Source:** `apps/api/src/routes/exports.ts`

## Responsibility
Exports a story's completed chapters as a downloadable Markdown or EPUB file; delegates to an async queue job when the chapter count exceeds the synchronous threshold.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/stories/:storyId/exports` | Exports the story; renders synchronously for small stories, enqueues `generate-export` job for large ones |

## Inputs
- **`StoryParam`** — `{ storyId: UUID }`
- **`ExportBody`** — `{ format: 'markdown' | 'epub' }` — validated against `EXPORT_CONFIG.SUPPORTED_FORMATS`

## Outputs
- **Synchronous (small story):**
  - `markdown` → `200` with `Content-Type: text/markdown`, `Content-Disposition: attachment; filename="<slug>.md"`
  - `epub` → `200` with `Content-Type: application/epub+zip`, `Content-Disposition: attachment; filename="<slug>.epub"`
- **Async (large story, > `SYNC_CHAPTER_THRESHOLD`):**
  - `202 { status: 'queued', jobId }`
- Error responses: `400 invalid_format`, `404 not_found`

## Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()`; reads `stories` and `chapters` (content + non-null filter)
- [[package-core]] — `EXPORT_CONFIG`, `renderMarkdown()`, `renderEpub()` (epub-exporter, markdown-exporter)
- [[modules/queue-client]] — `enqueueGenerateExport()` for async large-story exports

## Used by
- [[app-web]] — export button in story toolbar
- [[app-api]] — registered here

## Related database tables
- [[database/tables/stories]]
- [[database/tables/chapters]]

## Related flows
- [[flows/job-worker-flow]] — async export job processed by the worker when chapter count exceeds threshold

## Related domain concepts
- Synchronous vs async export threshold (`EXPORT_CONFIG.SYNC_CHAPTER_THRESHOLD`)
- Slug generation (Unicode normalization + ASCII-safe kebab-case from story title)
- EPUB rendering (binary buffer returned directly)
