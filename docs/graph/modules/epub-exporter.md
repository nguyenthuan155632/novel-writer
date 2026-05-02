---
type: module
source: packages/core/src/services/exporters/epub-exporter.ts
---

# Module: EPUB Exporter

**Type:** Module  
**Source:** `packages/core/src/services/exporters/epub-exporter.ts`

## Responsibility
Exports a story's chapters as an EPUB file, converting plain-text chapter content into structured HTML and packaging it via `epub-gen-memory`.

## Key exports / functions
- `renderEpub(input: EpubExportInput): Promise<Buffer>`
  - Generates a complete EPUB file in memory
  - Returns a `Buffer` containing the EPUB binary

## Types
- `EpubExportInput`:
  ```
  story: { title, author: string | null, synopsis: string | null }
  chapters: Array<{ number, title, content }>
  ```

## Implementation notes
- Each paragraph (double-newline separated) is wrapped in `<p>` tags with HTML escaping
- Chapter titles formatted as: `Chương {number} — {title}`
- Author falls back to `EXPORT_CONFIG.EPUB_AUTHOR_FALLBACK` when null
- Language from `EXPORT_CONFIG.EPUB_LANGUAGE`
- Uses `epub-gen-memory` npm package (handles the `.default` ESM/CJS interop)

## Depends on
- `@novel/core` — for `EXPORT_CONFIG`
- `epub-gen-memory` — third-party EPUB generation library

## Used by
- [[jobs/job-generate-export]] — when export format is `epub`

## Related database tables
- [[database/tables/chapters]] — source chapter content
- [[database/tables/stories]] — source story metadata

## Related flows
- [[flows/chapter-generation-flow]]
