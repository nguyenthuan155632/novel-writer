---
type: domain-concept
---

# Domain: Faction

**Type:** Domain Concept

## Description
A faction is an organization, institution, or social group in the story world — such as sects (*môn phái*), clans (*gia tộc*), kingdoms, or merchant guilds. Factions are primary world-building elements in xianxia fiction, providing the political and power-structure backdrop against which characters cultivate and compete. The [[domain/story-bible]] typically establishes the major factions at world-generation time.

## Key Properties / Rules
- `name` — unique name of the faction within the story
- `description` — lore description: history, beliefs, goals
- `type` — category of organization (e.g., `sect | clan | kingdom | guild | demonic_organization`)
- `powerLevel` / `influence` — relative standing in the story's power hierarchy
- `alignment` — narrative alignment (e.g., `righteous | demonic | neutral | hidden`)
- `storyId` — belongs to a single story
- Factions can appear in [[domain/canon-fact]] entries (e.g., "The Azure Sword Sect was destroyed in chapter 100")
- New unnamed factions introduced in prose are flagged by [[validators/check-unknown-location]] or a character check if they are referenced but not in the DB

> **Note:** Exact schema fields should be verified against `packages/db/src/schema/factions.ts`.

## Related Database Tables
- [[database/tables/factions]]
- [[database/tables/canon-facts]]

## Related Flows
- [[jobs/job-generate-chapter]] — faction references validated during deterministic checks

## Related Domain Concepts
- [[domain/character]]
- [[domain/story-bible]]
- [[domain/xianxia]]
- [[domain/canon-fact]]

## Implemented By
- `packages/db/src/schema/factions.ts`
- [[agents/bible-generator]] — establishes initial factions during world-building
