---
type: module
source: packages/core/src/services/exporters/markdown-exporter.ts
---

# Module: Markdown Exporter

**Type:** Module  
**Source:** `packages/core/src/services/exporters/markdown-exporter.ts`

## Responsibility
Exports a story's chapters as a single Markdown document with standard heading structure.

## Key exports / functions
- `renderMarkdown(input: MarkdownExportInput): string`
  - Returns a complete Markdown string for the entire story
  - Synchronous (pure function, no I/O)

## Types
- `MarkdownExportInput`:
  ```
  story: { title, author: string | null, synopsis: string | null }
  chapters: Array<{ number, title, content }>
  ```

## Output format
```
# {story.title}

_by {author}_

{synopsis}

---

## Chương {number} — {title}

{content}
```

## Implementation notes
- Author line omitted when `story.author` is null
- Synopsis omitted when `story.synopsis` is null
- A `---` separator follows the story header
- Chapter headings use `##` level
- Pure string concatenation — no external dependencies

## Used by
- [[jobs/job-generate-export]] — when export format is `markdown`

## Related database tables
- [[database/tables/chapters]] — source chapter content
- [[database/tables/stories]] — source story metadata

## Related flows
- [[flows/chapter-generation-flow]]
