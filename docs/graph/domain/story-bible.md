---
type: domain-concept
---

# Domain: Story Bible

**Type:** Domain Concept

## Description
The story bible is the master reference document for a story's fictional world. It is generated once (before any chapters are written) and acts as the **HOT tier** of the context cache — stable, authoritative, and included in every chapter generation prompt. Once generated, it locks the story's genre and power system conventions. The bible can be versioned (updated), but each update increments the version number.

## Key Properties / Rules
- `worldRules` — prose description of the world's fundamental laws, geography, and history
- `powerSystem` — description of how power is acquired and wielded
- `powerSystemKind` — enum: `cultivation | martial | ability | tech | urban | historical | horror | mystery | system | reincarnation | mixed | none`
- `cultivationSystem` — detailed realm tiers for xianxia settings (e.g., Qi Condensation, Foundation Establishment…)
- `bloodlineSystem` — rules governing bloodline awakening, inheritance, and power (see [[domain/bloodline]])
- `styleGuide` — prose style instructions (point of view, pacing, sentence rhythm)
- `forbiddenRules` — explicit prohibitions for the AI (e.g., "never use modern slang", "no deus ex machina realm breaks"); enforced by [[validators/check-forbidden-move]]
- `endingDirection` — high-level narrative direction for the story's conclusion
- `compactSummary` — short summary of the world for use in compressed context
- `styleFewShots` — example prose snippets demonstrating the target style
- `version` — integer, incremented on each update
- **Genre is locked** after the first bible generation (`genreLockedAt` on [[domain/story]])
- The full bible is the **HOT tier** of the [[domain/context-tiers]] system; it is hashed to detect cache invalidation

## Related Database Tables
- [[database/tables/story-bibles]]
- [[database/tables/stories]] (`genreLockedAt`)

## Related Flows
- [[routes/bible]] — API route for bible management

## Related Domain Concepts
- [[domain/story]]
- [[domain/xianxia]]
- [[domain/context-tiers]]
- [[domain/character]]
- [[domain/bloodline]]
- [[domain/faction]]

## Implemented By
- `packages/db/src/schema/story-bibles.ts`
- [[agents/bible-generator]] — generates the initial bible
- [[prompts/prompt-bible-generator-v2]]
- [[prompts/contract-genre]] — genre rules injected from HOT tier
