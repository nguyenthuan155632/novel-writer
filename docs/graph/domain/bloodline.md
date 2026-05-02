---
type: domain-concept
---

# Domain: Bloodline

**Type:** Domain Concept

## Description
A bloodline is a special hereditary power lineage that a [[domain/character]] can awaken or inherit, central to the xianxia (`tien_hiep`) genre. Bloodlines confer unique abilities, affinities, or destiny markers beyond a character's normal cultivation path. The story bible defines the `bloodlineSystem` — the rules governing what bloodlines exist and how they are acquired.

## Key Properties / Rules
- `name` — name of the bloodline (e.g., "Azure Dragon Bloodline", "Primordial Phoenix Vein")
- `description` — lore description and effects
- `rarity` — tier / rarity level within the story's power system
- `sourceCharacter` (optional) — if inherited from a specific ancestor or entity
- **`MAX_NEW_BLOODLINES_PER_ARC = 2`** (from `GENERATION_CONFIG`) — at most 2 new bloodlines may be introduced per arc
- New bloodlines introduced in a chapter are validated by [[validators/check-new-bloodline-source]] to confirm the origin is canon-consistent
- Bloodlines are tracked on the character record (`currentBloodlines` array in [[domain/character]])
- `bloodlineSystem` in the [[domain/story-bible]] governs overall lore rules

## Related Database Tables
- [[database/tables/bloodlines]]
- [[database/tables/characters]]

## Related Flows
- [[jobs/job-generate-chapter]] — validator stage checks new bloodline introductions

## Related Domain Concepts
- [[domain/character]]
- [[domain/story-bible]]
- [[domain/xianxia]]
- [[domain/canon-fact]]

## Implemented By
- `packages/db/src/schema/bloodlines.ts`
- `packages/core/src/config/generation.ts` — `MAX_NEW_BLOODLINES_PER_ARC`
- [[validators/check-new-bloodline-source]]
