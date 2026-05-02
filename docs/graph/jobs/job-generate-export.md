---
type: job
source: apps/worker/src/jobs/generate-export.ts
---

# Job: generate-export

## Responsibility
Async export of story chapters to markdown or epub file.

## Source Evidence
`apps/worker/src/jobs/generate-export.ts` — `runGenerateExportJob()`

## Queue
`generate-export` (concurrency 2)

## Job Data
- `storyId`, `format` (markdown/epub), `chapterRange?`

## Behavior
- For >200 chapters: always async (enqueued from [[routes/route-exports]])
- For ≤200 chapters: can be sync from API
- Writes output to `EXPORT_OUTPUT_DIR` (default `./exports`)

## Depends On
- [[packages/package-core]] exporters: `epub-exporter.ts`, `markdown-exporter.ts`
- [[database/tables/chapters]]
- [[configs/config-export]]
---
type: job
source: apps/worker/src/jobs/generate-export.ts
---

# Job: generate-export

## Responsibility
Async export of story chapters to markdown or epub file format.

## Source Evidence
`apps/worker/src/jobs/generate-export.ts` — `runGenerateExportJob()`

## Queue
`generate-export` (concurrency 2)

## Job Data
- `storyId`, `format` (markdown/epub), optional `chapterRange`

## Behavior
- Triggered async for >200 chapters (sync threshold from [[configs/config-export]])
- Output dir: `EXPORT_OUTPUT_DIR` (default `./exports`)

## Depends On
- [[packages/package-core]] — epub-exporter, markdown-exporter
- [[database/tables/chapters]]
- [[configs/config-export]]
