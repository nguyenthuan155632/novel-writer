---
type: domain-concept
---

# Domain: Xianxia (Tiên Hiệp)

**Type:** Domain Concept

## Description
*Xianxia* (tiên hiệp — 仙俠, lit. "immortal hero") is the primary genre setting for the novel factory. It refers to Chinese-style cultivation fantasy fiction where characters pursue immortality through stages of spiritual/martial cultivation, wielding elemental powers, bloodline abilities, and sect politics as core dramatic elements. The Vietnamese reading community uses the term *tiên hiệp* (genre slug: `tien_hiep`).

## Key Genre Conventions
- **Cultivation realms**: characters progress through a tiered system of spiritual levels (e.g., Qi Condensation → Foundation Establishment → Golden Core → Nascent Soul → …). The story bible defines the specific realm tiers via `cultivationSystem`.
- **Power system** (`powerSystemKind`): one of `cultivation | martial | ability | tech | urban | historical | horror | mystery | system | reincarnation | mixed | none`
- **Bloodlines** (*huyết mạch*): hereditary power lineages (see [[domain/bloodline]]); tracked by `bloodlineSystem` in the story bible
- **Sects / factions** (*môn phái*, *gia tộc*): organizations structuring the world's power landscape (see [[domain/faction]])
- **Realm jumping**: gaining more than 1 realm per chapter is forbidden; max 1 per arc — enforced by [[validators/check-realm-jump]]
- **Forbidden rules**: story-specific prohibitions stored in the [[domain/story-bible]] under `forbiddenRules`; enforced by [[validators/check-forbidden-move]]
- Genre is **locked** after [[domain/story-bible]] generation (`genreLockedAt` on the story record)

## Character Personality Archetypes (from catalog)
Defined in `packages/core/src/catalog/personalities.ts`:
- `tram_on` — steady, composed, philosophical
- `cuong_dao` — ruthless, decisive, pragmatic
- `linh_hoat` — witty, adaptable, sharp
- `hanh_dong` — action-first, impulsive, loyal
- `tu_bi` — compassionate, self-sacrificing

## Genre Contracts
- [[prompts/contract-genre]] — genre-specific writing rules injected into the HOT context tier
- [[prompts/contract-personality]] — personality-driven prose style rules
- [[prompts/contract-story-options]] — feature toggles (e.g., `enableHarem`, `enableReincarnation`)

## Related Database Tables
- [[database/tables/stories]] (`genre` field, `genreLockedAt`)
- [[database/tables/story-bibles]] (`cultivationSystem`, `bloodlineSystem`, `powerSystemKind`)

## Related Flows
- [[agents/bible-generator]] — generates the world rules and cultivation system

## Related Domain Concepts
- [[domain/story]]
- [[domain/story-bible]]
- [[domain/character]]
- [[domain/bloodline]]
- [[domain/faction]]
- [[domain/context-tiers]]

## Implemented By
- `packages/core/src/catalog/genres.ts` — genre definitions, slug `tien_hiep`
- `packages/core/src/catalog/personalities.ts` — personality archetypes
- `packages/core/src/catalog/story-options.ts` — feature toggles
- [[prompts/contract-genre]]
