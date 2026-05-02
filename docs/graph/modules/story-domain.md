---
type: module
source: packages/ai/src/story-domain.ts
---

# Module: Story Domain Context Loader

## Responsibility
Loads story-level domain context from catalog definitions: genre definition, personality definition, story options.

## Source Evidence
`packages/ai/src/story-domain.ts` — `loadStoryDomainContext()`

## Inputs
- `storyId` (reads `stories` table for genre, personality, tone)

## Outputs
- `genreDef` — genre family, name, features
- `personalityDef` — protagonist archetype traits
- `storyOptions` — tone, pacing, POV, etc.

## Depends On
- [[packages/package-core]] catalog (genres.ts, personalities.ts, story-options.ts)
- [[database/tables/stories]]

## Used By
- [[jobs/job-generate-chapter]] (Stage 1 setup)
- [[modules/context-builder]]
---
type: module
source: packages/ai/src/story-domain.ts
---

# Module: Story Domain Context Loader

## Responsibility
Loads story-level domain context (genre def, personality def, story options) from catalog.

## Source Evidence
`packages/ai/src/story-domain.ts` — `loadStoryDomainContext()`

## Inputs
- `storyId` → reads [[database/tables/stories]]

## Outputs
- `genreDef`, `personalityDef`, `storyOptions`

## Depends On
- [[packages/package-core]] catalogs (genres, personalities, story-options)

## Used By
- [[jobs/job-generate-chapter]] (Stage 1)
- [[modules/context-builder]]
