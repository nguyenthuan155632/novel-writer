---
type: domain-concept
---

# Domain: Story

**Type:** Domain Concept

## Description
A "story" is the top-level container for a novel project. It holds the core creative configuration — title, premise, genre, main character personality, tone, and target chapter count — and acts as the root entity that all other domain objects (sagas, arcs, chapters, characters, etc.) belong to.

## Key Properties / Rules
- `title` — human-readable name of the story
- `premise` — one-paragraph description of the story's central conflict and world
- `genre` — selected from the genre catalog (e.g., `tien_hiep`); **locked after bible generation** (`genreLockedAt` timestamp set)
- `mainCharacterPersonality` — archetype from the personality catalog (e.g., `cuong_dao`, `linh_hoat`)
- `tone` — narrative tone descriptor (e.g., dark, hopeful, epic)
- `targetChapterCount` — integer 1–10000, default 1000
- `status` — lifecycle state: `created` → bible generated → sagas planned → arcs planned → chapters generated
- Genre lock prevents genre changes from invalidating an already-generated [[domain/story-bible]]
- Per-story config overrides (model routes, budget, context window sizes) are stored in `story_settings` and loaded via `getEffectiveConfig(storyId, provider)`

## Lifecycle
1. `created` — story record created with title, premise, genre, personality
2. Bible generated — [[agents/bible-generator]] writes worldRules, power system, style guide; `genreLockedAt` is stamped
3. Sagas planned — [[agents/saga-planner]] divides the story into major divisions
4. Arcs planned — [[agents/arc-planner]] divides each saga into arcs
5. Chapters generated — [[jobs/job-generate-chapter]] runs the full pipeline per chapter

## Related Database Tables
- [[database/tables/stories]]
- [[database/tables/story-settings]]

## Related Flows
- [[jobs/job-generate-chapter]]
- [[jobs/job-generate-batch]]

## Related Domain Concepts
- [[domain/story-bible]]
- [[domain/saga]]
- [[domain/arc]]
- [[domain/chapter]]
- [[domain/generation-mode]]
- [[domain/xianxia]]

## Implemented By
- `packages/db/src/schema/stories.ts`
- `packages/core/src/config/generation.ts` — `GENERATION_CONFIG`, `LONG_FORM_CONFIG`
- `packages/ai/src/story-domain.ts` — `StoryDomainContext` loader
- `packages/core/src/catalog/genres.ts` — genre catalog
- `packages/core/src/catalog/personalities.ts` — personality catalog
