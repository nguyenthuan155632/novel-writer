---
type: config
source: packages/core/src/config/export-config.ts
---

# Config: Export

**Type:** Configuration Module  
**Source:** `packages/core/src/config/export-config.ts`

## Responsibility
Defines constants that govern chapter-export behaviour: the supported output formats, the chapter-count threshold for triggering a full sync, the EPUB language code, and the fallback author name for EPUB metadata.

## Key Constants

| Constant | Value | Description |
|---|---|---|
| `SYNC_CHAPTER_THRESHOLD` | `200` | Minimum chapter count before a full export sync is triggered |
| `SUPPORTED_FORMATS` | `['markdown', 'epub']` | Allowed export output formats (readonly tuple) |
| `EPUB_LANGUAGE` | `'vi'` | BCP-47 language code written into EPUB metadata (Vietnamese) |
| `EPUB_AUTHOR_FALLBACK` | `'AI Novel Factory'` | Author name used in EPUB metadata when no author is set on the story |

## Exported Types
- `ExportFormat` — `'markdown' | 'epub'` (derived from `SUPPORTED_FORMATS[number]`)

## Depends on
- [[packages/package-core]]

## Used by
- [[jobs/job-generate-export]] — reads all four constants: validates requested format against `SUPPORTED_FORMATS`, uses `EPUB_LANGUAGE` and `EPUB_AUTHOR_FALLBACK` when building EPUB metadata, checks `SYNC_CHAPTER_THRESHOLD` to decide whether a full sync is warranted

## Related domain concepts
- [[apps/app-api]] — export-related API endpoints validate the `format` query parameter against `SUPPORTED_FORMATS` before enqueuing the export job
- [[apps/app-web]] — the web dashboard surfaces export controls; available formats come from this config

## Notes
- `EPUB_LANGUAGE: 'vi'` is set specifically for the Vietnamese xianxia target audience and is embedded in the EPUB `<dc:language>` element.
- `SYNC_CHAPTER_THRESHOLD: 200` prevents expensive full-export operations on stories that are still early in their run.
- This config is **not** part of `EffectiveConfig` and has no per-story override path — export format settings are global.
