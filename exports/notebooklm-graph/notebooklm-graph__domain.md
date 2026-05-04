# Novel graph — domain

## arc

`domain/arc.md`

---
type: domain-concept
---



Domain: Arc Description
**Type:** Domain Concept
An "arc" is a story division within a saga, representing a contained narrative unit with a specific theme or conflict. Each saga contains 2–5 arcs. Arcs are the primary structural unit for triggering high-stakes reviews and safe-mode escalations, making them critical control points in the generation pipeline.



Domain: Arc Key Properties / Rules
- `arcNumber` — ordinal position within its parent saga (1-based)
- `startChapter` / `endChapter` — chapter range this arc covers
- `theme` — short description of the arc's central narrative theme
- `summary` — human/AI summary of the arc's events
- `rollingContext` — AI-maintained rolling summary, **refreshed every 5 chapters** (`ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS = 5`)
- **Arc boundaries are special**: the first and last chapter of an arc automatically trigger:
- Escalation to `safe` [[domain/generation-mode]] (human approval required)
- [[jobs/job-high-stakes-review]] queued asynchronously
- `rollingContext` is part of the **WARM context tier** fed to the writer
- Arcs per saga: **2–5** (`LONG_FORM_CONFIG.ARCS_PER_SAGA_RANGE`)



Domain: Arc Related Database Tables
- [[database/tables/arcs]]



Domain: Arc Related Flows
- [[jobs/job-refresh-arc-summary]] — triggers `rollingContext` refresh
- [[jobs/job-high-stakes-review]] — triggered at arc boundaries
- [[jobs/job-generate-chapter]] — checks arc boundary for mode escalation



Domain: Arc Related Domain Concepts
- [[domain/story]]
- [[domain/saga]]
- [[domain/chapter]]
- [[domain/generation-mode]]
- [[domain/context-tiers]]



Domain: Arc Implemented By
- `packages/db/src/schema/arcs.ts`
- `packages/core/src/config/generation.ts` — `LONG_FORM_CONFIG`, `ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS`
- [[agents/arc-planner]] — creates the arc plan
- [[prompts/prompt-arc-planner-v2]]

---

## bloodline

`domain/bloodline.md`

---
type: domain-concept
---



Domain: Bloodline Description
**Type:** Domain Concept
A bloodline is a special hereditary power lineage that a [[domain/character]] can awaken or inherit, central to the xianxia (`tien_hiep`) genre. Bloodlines confer unique abilities, affinities, or destiny markers beyond a character's normal cultivation path. The story bible defines the `bloodlineSystem` — the rules governing what bloodlines exist and how they are acquired.



Domain: Bloodline Key Properties / Rules
- `name` — name of the bloodline (e.g., "Azure Dragon Bloodline", "Primordial Phoenix Vein")
- `description` — lore description and effects
- `rarity` — tier / rarity level within the story's power system
- `sourceCharacter` (optional) — if inherited from a specific ancestor or entity
- **`MAX_NEW_BLOODLINES_PER_ARC = 2`** (from `GENERATION_CONFIG`) — at most 2 new bloodlines may be introduced per arc
- New bloodlines introduced in a chapter are validated by [[validators/check-new-bloodline-source]] to confirm the origin is canon-consistent
- Bloodlines are tracked on the character record (`currentBloodlines` array in [[domain/character]])
- `bloodlineSystem` in the [[domain/story-bible]] governs overall lore rules



Domain: Bloodline Related Database Tables
- [[database/tables/bloodlines]]
- [[database/tables/characters]]



Domain: Bloodline Related Flows
- [[jobs/job-generate-chapter]] — validator stage checks new bloodline introductions



Domain: Bloodline Related Domain Concepts
- [[domain/character]]
- [[domain/story-bible]]
- [[domain/xianxia]]
- [[domain/canon-fact]]



Domain: Bloodline Implemented By
- `packages/db/src/schema/bloodlines.ts`
- `packages/core/src/config/generation.ts` — `MAX_NEW_BLOODLINES_PER_ARC`
- [[validators/check-new-bloodline-source]]

---

## canon-fact

`domain/canon-fact.md`

---
type: domain-concept
---



Domain: Canon Fact Description
**Type:** Domain Concept
A canon fact is an established story truth that **must remain consistent** across all future chapters. Canon facts are extracted automatically after each chapter is generated, staged as [[domain/pending-canon-update]] entries, and — after human approval or auto-merge — become permanent constraints on the story world. They form the ground truth that deterministic validators check against during [[domain/chapter-packet]] auditing and chapter validation.



Domain: Canon Fact Key Properties / Rules
- `content` — the factual statement (e.g., "Elder Huang died in chapter 42", "The Azure Sect is located in the Northern Mountains")
- `importance` — **`'low' | 'medium' | 'high' | 'locked'`**
- `locked` facts **cannot be contradicted** under any circumstance; checked by [[validators/check-locked-fact]]
- `high` facts trigger a warning if contradicted
- `tags` — topic classification array (e.g., `['character', 'death']`, `['location', 'sect']`)
- `storyId` + `chapterNumber` — origin tracking
- Facts are **never written directly** to the canon table; they always pass through [[domain/pending-canon-update]] first (via [[modules/canon-merger]])
- `locked` facts are used as hard constraints by the deterministic validator suite



Domain: Canon Fact Canon Integrity Rule
> Never write directly to canon tables. New facts are staged as `pending_canon_updates` and processed through [[modules/canon-merger]].



Domain: Canon Fact Related Database Tables
- [[database/tables/canon-facts]]
- [[database/tables/pending-canon-updates]]



Domain: Canon Fact Related Flows
- [[jobs/job-generate-chapter]] — Stage 7 (MEMORY: canon extraction)



Domain: Canon Fact Related Domain Concepts
- [[domain/pending-canon-update]]
- [[domain/chapter]]
- [[domain/character]]



Domain: Canon Fact Implemented By
- `packages/db/src/schema/canon-facts.ts`
- [[agents/canon-extractor]] — extracts facts from generated chapter prose
- [[modules/canon-merger]] — stages and merges extracted facts
- [[validators/check-locked-fact]] — enforces `locked` importance level
- [[prompts/prompt-canon-extractor-v2]]

---

## chapter-packet

`domain/chapter-packet.md`

---
type: domain-concept
---



Domain: Chapter Packet Description
**Type:** Domain Concept
A "chapter packet" is the AI-generated structural plan for a chapter, produced **before** any prose is written. It functions as a bridge between high-level arc planning and the actual writing step, giving the writer agent a concrete set of scene targets, character actions, and tone directives to follow.



Domain: Chapter Packet Key Properties / Rules
- Contains: scene outlines, character actions, tone notes, conflict beats, foreshadowing cues
- Generated by [[agents/packet-generator]] from the current `ChapterContext`
- **Audited before use**: [[validators/packet-auditor]] performs a deterministic canon check — verifies that no locked facts are contradicted and that character states are consistent
- If the audit fails validation, the packet may be regenerated or escalated to human review
- The validated packet is then passed as part of the **COLD context tier** to [[agents/writer]]
- Stored persistently in [[database/tables/chapter-packets]] so generation can be inspected or retried



Domain: Chapter Packet Generation Flow
1. [[agents/packet-generator]] produces the packet (LLM call)
2. [[validators/packet-auditor]] audits for canon consistency (deterministic)
3. On pass → serialized into `ChapterContext` COLD tier
4. [[agents/writer]] consumes it to write prose



Domain: Chapter Packet Related Database Tables
- [[database/tables/chapter-packets]]



Domain: Chapter Packet Related Flows
- [[jobs/job-generate-chapter]] — Stage 1 (PLAN)
- [[pipelines/chapter-generation-pipeline]]



Domain: Chapter Packet Related Domain Concepts
- [[domain/chapter]]
- [[domain/canon-fact]]
- [[domain/context-tiers]]



Domain: Chapter Packet Implemented By
- `packages/ai/src/agents/packet-generator.ts`
- [[agents/packet-generator]]
- [[validators/packet-auditor]]
- [[agents/writer]]
- [[prompts/prompt-packet-generator-v2]]

---

## chapter

`domain/chapter.md`

---
type: domain-concept
---



Domain: Chapter Description
**Type:** Domain Concept
A chapter is the minimum atomic unit of generated content — a single prose section of the novel. Each chapter is written by the [[agents/writer]] from a [[domain/chapter-packet]] plan, targeting 2000–3000 words of Vietnamese xianxia prose. Chapters cannot be generated unless the story already has a [[domain/story-bible]], at least one [[domain/saga]], and an enclosing [[domain/arc]].



Domain: Chapter Key Properties / Rules
- `chapterNumber` — global ordinal within the story (1-based)
- `title` — extracted from the `TITLE:` prefix line in the writer's output
- `content` — full Vietnamese prose (stored as text)
- `wordCount` — character count of generated prose; **2000–3000 target**, **1500–4000 hard fail range** (checked by [[validators/check-word-count]])
- `status` — lifecycle state:
- `draft` → `generating` → `completed`
- `failed` — generation error
- `paused_pending_updates` — blocked by a [[domain/pending-canon-update]] with `conflictStatus = blocking`
- After generation, the pipeline automatically:
1. Extracts summaries → [[database/tables/chapter-summaries]]
2. Extracts [[domain/canon-fact]] entries via [[agents/canon-extractor]]
3. Pays off any [[domain/planted-seed]] entries due at this chapter



Domain: Chapter Related Database Tables
- [[database/tables/chapters]]
- [[database/tables/chapter-summaries]]
- [[database/tables/chapter-packets]]



Domain: Chapter Related Flows
- [[jobs/job-generate-chapter]] — orchestrates the full pipeline
- [[pipelines/chapter-generation-pipeline]]



Domain: Chapter Related Domain Concepts
- [[domain/chapter-packet]]
- [[domain/story-bible]]
- [[domain/saga]]
- [[domain/arc]]
- [[domain/canon-fact]]
- [[domain/planted-seed]]
- [[domain/pending-canon-update]]
- [[domain/generation-mode]]
- [[domain/context-tiers]]



Domain: Chapter Implemented By
- `packages/db/src/schema/chapters.ts`
- `packages/core/src/config/generation.ts` — `CHAPTER_WORD_COUNT_*` constants
- [[agents/writer]] — Stage 5 of pipeline
- [[validators/check-word-count]]

---

## character

`domain/character.md`

---
type: domain-concept
---



Domain: Character Description
**Type:** Domain Concept
A character is a named entity in the story world — protagonist, antagonist, or supporting cast. Characters carry cultivation state (realm), vital status, abilities, and bloodlines. This state is authoritative: the generation pipeline's deterministic validators consult character records to enforce narrative consistency (e.g., dead characters cannot act; realm jumps must be legal).



Domain: Character Key Properties / Rules
- `name` — unique identifier within the story
- `currentRealm` — current cultivation level (xianxia genre); e.g., `"Foundation Establishment"`, `"Nascent Soul"`. Validated by [[validators/check-realm-jump]] (max 1 realm jump per chapter, 1 per arc)
- `status` — **`alive | dead | unknown`**
- `dead` characters cannot perform actions; checked by [[validators/check-dead-character]]
- `currentBloodlines` — array of [[domain/bloodline]] IDs currently possessed
- `abilities` — list of known techniques/skills
- `aliases` — alternative names (for recognition in prose)
- `role` — narrative role: `protagonist | antagonist | supporting | background`
- Character deaths are propagated to [[domain/canon-fact]] entries via [[agents/canon-extractor]]
- New characters appearing in prose for the first time are flagged by [[validators/check-unknown-character]]



Domain: Character Related Database Tables
- [[database/tables/characters]]



Domain: Character Related Flows
- [[jobs/job-generate-chapter]] — character state is read for context and validated post-generation



Domain: Character Related Domain Concepts
- [[domain/bloodline]]
- [[domain/canon-fact]]
- [[domain/pending-canon-update]]
- [[domain/xianxia]]



Domain: Character Implemented By
- `packages/db/src/schema/characters.ts`
- [[validators/check-dead-character]]
- [[validators/check-realm-jump]]
- [[validators/check-unknown-character]]
- [[agents/canon-extractor]] — extracts character state changes

---

## context-tiers

`domain/context-tiers.md`

---
type: domain-concept
---



Domain: Context Tiers Description
**Type:** Domain Concept
The 3-tier context cache is the system that assembles the full prompt context for each chapter generation call. Rather than sending all story data to the LLM on every call, context is classified into three tiers by stability and recency. This keeps token usage predictable, enables caching of stable content (HOT tier), and ensures the most relevant recent facts occupy the variable (COLD) tier.



Domain: Context Tiers The Three Tiers HOT Tier (target: ~2500 tokens)
Stable, world-level content that rarely changes. Hashed for cache detection — if the hash matches the previous call, the LLM provider can potentially cache the prefix.
- [[domain/story-bible]]: world rules, power system, cultivation system, bloodline system
- Style guide and style few-shots
- Genre contract ([[prompts/contract-genre]])
- Personality contract ([[prompts/contract-personality]])



Domain: Context Tiers The Three Tiers WARM Tier (target: ~2000 tokens)
Story-progress-level content that changes on the scale of arcs or sagas.
- [[domain/saga]] `rollingContext` (refreshed every 20 chapters)
- [[domain/arc]] `rollingContext` (refreshed every 5 chapters)
- Active [[domain/character]] list (compact mode if over budget)
- Open [[domain/open-thread|open threads]] (`status = open`)
- Active [[domain/planted-seed|planted seeds]] (summary)



Domain: Context Tiers The Three Tiers COLD Tier (target: ~1500 tokens)
Highly specific, chapter-level content assembled fresh for every generation.
- Recent chapter summaries (last 5) from [[database/tables/chapter-summaries]]
- Vector-retrieved [[domain/canon-fact|canon facts]] (top 8 by embedding similarity)
- [[domain/planted-seed|Seeds]] with `status = due` at current chapter
- The [[domain/chapter-packet]] for the chapter being written



Domain: Context Tiers Budget Rules
- Total **normal** budget: **6000 tokens**
- Total **important** budget: **10000 tokens**
- **Shrink order** (when over budget): `retrievedPastChapters` → `retrievedFacts` → `recentSummaries` → `activeCharactersCompactMode`
- Token budgets defined as: `TOKEN_BUDGET_HOT_TARGET`, `TOKEN_BUDGET_WARM_TARGET`, `TOKEN_BUDGET_COLD_TARGET`



Domain: Context Tiers Related Database Tables
- [[database/tables/context-packets]] — every context build logged here
- [[database/tables/chapter-summaries]]
- [[database/tables/story-bibles]]



Domain: Context Tiers Related Flows
- [[jobs/job-generate-chapter]] — triggers context build before writing



Domain: Context Tiers Related Domain Concepts
- [[domain/story-bible]]
- [[domain/saga]]
- [[domain/arc]]
- [[domain/chapter-packet]]
- [[domain/canon-fact]]
- [[domain/planted-seed]]
- [[domain/open-thread]]
- [[domain/character]]



Domain: Context Tiers Implemented By
- `packages/ai/src/context/` — `buildContext()`, `serializeContextForWriter()`
- [[modules/context-builder]]
- [[packages/package-ai]]

---

## faction

`domain/faction.md`

---
type: domain-concept
---



Domain: Faction Description
**Type:** Domain Concept
A faction is an organization, institution, or social group in the story world — such as sects (*môn phái*), clans (*gia tộc*), kingdoms, or merchant guilds. Factions are primary world-building elements in xianxia fiction, providing the political and power-structure backdrop against which characters cultivate and compete. The [[domain/story-bible]] typically establishes the major factions at world-generation time.



Domain: Faction Key Properties / Rules
- `name` — unique name of the faction within the story
- `description` — lore description: history, beliefs, goals
- `type` — category of organization (e.g., `sect | clan | kingdom | guild | demonic_organization`)
- `powerLevel` / `influence` — relative standing in the story's power hierarchy
- `alignment` — narrative alignment (e.g., `righteous | demonic | neutral | hidden`)
- `storyId` — belongs to a single story
- Factions can appear in [[domain/canon-fact]] entries (e.g., "The Azure Sword Sect was destroyed in chapter 100")
- New factions introduced in prose with a Vietnamese faction prefix (`môn phái`, `gia tộc`, `tông môn`, `liên minh`, `vương triều`, `đế quốc`, `tà phái`, `chính phái`, `thương hội`, `sơn trại`, ...) are flagged by [[validators/check-unknown-faction]] when not in the `factions` table
- Faction lifecycle changes (status `active → destroyed | hidden | absorbed`, alliance/enemy shifts) are extracted by [[agents/canon-extractor]] as `factionUpdates[]` and applied by [[modules/canon-merger]]
- Destroyed/absorbed factions have `status` snapshot-locked; only `status` (revival) and `notes` may change without conflict
> **Note:** Exact schema fields should be verified against `packages/db/src/schema/factions.ts`.



Domain: Faction Related Database Tables
- [[database/tables/factions]]
- [[database/tables/canon-facts]]



Domain: Faction Related Flows
- [[jobs/job-generate-chapter]] — faction references validated during deterministic checks



Domain: Faction Related Domain Concepts
- [[domain/character]]
- [[domain/story-bible]]
- [[domain/xianxia]]
- [[domain/canon-fact]]



Domain: Faction Implemented By
- `packages/db/src/schema/factions.ts`
- [[agents/bible-generator]] — establishes initial factions during world-building

---

## generation-mode

`domain/generation-mode.md`

---
type: domain-concept
---



Domain: Generation Mode Description
**Type:** Domain Concept
Generation mode controls how many chapters are generated per batch and whether human approval is required between chapters. It is the primary safety lever for maintaining narrative quality at scale. Modes can be set manually per generation request or configured as a default in `story_settings`; the pipeline can also **auto-escalate** to `safe` mode when risk factors are detected.



Domain: Generation Mode Modes
| Mode | Batch Size | Human Approval |
|------|-----------|---------------|
| `safe` | 1 chapter | Required before each chapter |
| `semi_auto` | 5 chapters | Required per batch |
| `full_auto` | 30 chapters | Not required |



Domain: Generation Mode Auto-Escalation to `safe` Mode
The pipeline automatically escalates to `safe` mode (overriding the configured mode) when **any** of the following conditions are met:
- First chapter of the story
- First chapter of an [[domain/arc]] (arc boundary)
- Last chapter of an [[domain/arc]] (arc boundary)
- [[validators/check-locked-fact]] or [[validators/check-realm-jump]] report a `high` or `critical` severity finding
- A [[domain/pending-canon-update]] with `conflictStatus = blocking` exists



Domain: Generation Mode Per-Story Configuration
Default generation mode is stored in [[database/tables/story-settings]] and loaded via `getEffectiveConfig(storyId, provider)`. It can be overridden per-request via the API.



Domain: Generation Mode Related Database Tables
- [[database/tables/story-settings]]
- [[database/tables/batches]]



Domain: Generation Mode Related Flows
- [[jobs/job-generate-batch]] — reads mode to compute batch size
- [[jobs/job-generate-chapter]] — enforces escalation checks



Domain: Generation Mode Related Domain Concepts
- [[domain/story]]
- [[domain/arc]]
- [[domain/chapter]]
- [[domain/pending-canon-update]]



Domain: Generation Mode Implemented By
- `packages/core/src/config/generation.ts` — `GENERATION_CONFIG.modes`
- `packages/core/src/policy/budget-guardrails.ts` — mode interacts with budget caps
- [[configs/policy-mode-escalation]] — escalation policy rules

---

## open-thread

`domain/open-thread.md`

---
type: domain-concept
---



Domain: Open Thread Description
**Type:** Domain Concept
An open thread is an unresolved narrative question, dangling mystery, or story hook that the writer should remain aware of. Unlike [[domain/planted-seed|planted seeds]] (which have a scheduled payoff chapter), open threads represent ongoing dramatic tension that may resolve organically or at the planner's discretion. They are surfaced to the writer via the WARM context tier to prevent the AI from inadvertently resolving or forgetting them.



Domain: Open Thread Key Properties / Rules
- `title` — brief label for the thread (e.g., "Who killed Master Chen?", "The sealed gate in the Northern Tomb")
- `description` — fuller explanation of the unresolved question
- `openedChapter` — chapter number where this thread was introduced or first noted
- `plannedResolutionChapter` (optional) — soft target for resolution; not enforced as a hard constraint
- `status` — **`open | resolved`**
- `open` threads are included in the **WARM context tier**
- `resolved` threads are excluded from future context
- Open threads are created/updated via [[domain/pending-canon-update]] with `targetTable = open_threads`
- The writer is expected to respect open threads (not accidentally resolve or contradict them without direction)



Domain: Open Thread Related Database Tables
- [[database/tables/open-threads]]



Domain: Open Thread Related Flows
- [[jobs/job-generate-chapter]] — open threads loaded into WARM context tier



Domain: Open Thread Related Domain Concepts
- [[domain/planted-seed]]
- [[domain/chapter]]
- [[domain/context-tiers]]
- [[domain/pending-canon-update]]
- [[domain/canon-fact]]



Domain: Open Thread Implemented By
- `packages/db/src/schema/open-threads.ts`
- [[modules/context-builder]] — loads open threads into WARM tier
- [[agents/canon-extractor]] — may create/resolve open threads via pending updates

---

## pending-canon-update

`domain/pending-canon-update.md`

---
type: domain-concept
---



Domain: Pending Canon Update Description
**Type:** Domain Concept
A pending canon update is a **staged, unconfirmed change** to one of the story's canon tables. Rather than writing extracted facts directly to canon tables, the system routes all changes through this staging layer, allowing human review (or automated approval for low-conflict updates) before they become permanent story truths.



Domain: Pending Canon Update Key Properties / Rules
- `targetTable` — which canon table is affected: `characters | canon_facts | open_threads | timeline_events | planted_seeds`
- `updateType` — the nature of the change: `create | update | resolve`
- `proposedData` — JSON blob with the proposed field values
- `resolution` — current review state: **`pending | approved | edited | rejected`**
- `conflictStatus` — severity of detected conflict:
- `none` — no conflict; eligible for **auto-merge**
- `warning` — possible inconsistency; flagged for human attention
- `blocking` — hard conflict detected; the associated [[domain/chapter]] is paused (`status = paused_pending_updates`) until a human resolves it
- **Auto-merge** applies when `conflictStatus = none` and `importance = low`; otherwise queued for human review in [[routes/pending-updates]]



Domain: Pending Canon Update Conflict → Chapter Pause Flow
1. [[modules/canon-merger]] detects `conflictStatus = blocking`
2. Parent chapter status → `paused_pending_updates`
3. Human resolves via [[routes/pending-updates]]
4. Chapter resumes generation



Domain: Pending Canon Update Related Database Tables
- [[database/tables/pending-canon-updates]]
- [[database/tables/canon-facts]]
- [[database/tables/characters]]
- [[database/tables/open-threads]]
- [[database/tables/timeline-events]]
- [[database/tables/planted-seeds]]



Domain: Pending Canon Update Related Flows
- [[routes/pending-updates]] — UI for human review
- [[jobs/job-generate-chapter]] — paused when blocking conflict exists



Domain: Pending Canon Update Related Domain Concepts
- [[domain/canon-fact]]
- [[domain/chapter]]
- [[domain/character]]
- [[domain/open-thread]]
- [[domain/planted-seed]]



Domain: Pending Canon Update Implemented By
- `packages/db/src/schema/pending-canon-updates.ts`
- [[modules/canon-merger]] — creates and resolves pending updates
- [[agents/canon-extractor]] — upstream producer
- [[modules/conflict-detector]] — sets `conflictStatus`

---

## planted-seed

`domain/planted-seed.md`

---
type: domain-concept
---



Domain: Planted Seed Description
**Type:** Domain Concept
A planted seed is a narrative foreshadowing element — a detail, prophecy, object, or event introduced early in the story that is intended to pay off at a specific later chapter. Seeds enforce long-range narrative coherence by ensuring that setup and payoff are explicitly tracked rather than left to the LLM's context window. They are created during saga planning and delivered to the writer via the COLD context tier when their payoff chapter arrives.



Domain: Planted Seed Key Properties / Rules
- `description` — what was planted (e.g., "The jade pendant given to the protagonist in ch. 3 has a dormant formation inside")
- `plantedAtChapter` — chapter where the seed was introduced
- `plannedPayoffChapter` — target chapter where the seed should resolve
- `status` — **`planted | due | paid_off | cancelled`**
- `due` — the current generation chapter equals `plannedPayoffChapter`; seed is injected into COLD context tier
- `paid_off` — seed resolved by a generated chapter
- `cancelled` — seed abandoned (arc restructure, explicit cancel)
- **10–30 seeds per saga plan** (`LONG_FORM_CONFIG.SEEDS_PER_SAGA_PLAN_RANGE = [10, 30]`)
- Seeds with `status = due` are included in the **COLD context tier** for the writer



Domain: Planted Seed Related Database Tables
- [[database/tables/planted-seeds]]



Domain: Planted Seed Related Flows
- [[jobs/job-generate-chapter]] — seeds due now are loaded into COLD context
- [[jobs/job-generate-batch]] — [[agents/saga-planner]] creates seeds during saga planning



Domain: Planted Seed Related Domain Concepts
- [[domain/saga]]
- [[domain/chapter]]
- [[domain/context-tiers]]
- [[domain/pending-canon-update]]



Domain: Planted Seed Implemented By
- `packages/db/src/schema/planted-seeds.ts`
- `packages/core/src/config/generation.ts` — `LONG_FORM_CONFIG.SEEDS_PER_SAGA_PLAN_RANGE`
- [[agents/saga-planner]] — creates seeds during saga plan
- [[modules/context-builder]] — injects due seeds into COLD tier

---

## saga

`domain/saga.md`

---
type: domain-concept
---



Domain: Saga Description
**Type:** Domain Concept
A "saga" is the largest structural division within a story, analogous to a book or major act. Stories are divided into 5–8 sagas (per `LONG_FORM_CONFIG`), each of which groups a set of related arcs. Sagas give the AI planner a high-level narrative frame and carry a rolling AI-maintained summary that keeps later chapters aware of earlier events without re-reading full content.



Domain: Saga Key Properties / Rules
- `sagaNumber` — ordinal position within the story (1-based)
- `startChapter` / `endChapter` — chapter range this saga covers
- `title` — brief name for the saga
- `summary` — human/AI summary of the saga's events
- `rollingContext` — AI-maintained rolling summary, **refreshed every 20 chapters** (`SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS = 20`)
- Each saga contains **2–5 arcs** (`LONG_FORM_CONFIG.ARCS_PER_SAGA_RANGE`)
- **10–30 planted seeds** are created per saga plan (`LONG_FORM_CONFIG.SEEDS_PER_SAGA_PLAN_RANGE`); these are foreshadowing elements linked to the saga
- `rollingContext` is part of the **WARM context tier** fed to the writer



Domain: Saga Related Database Tables
- [[database/tables/sagas]]
- [[database/tables/planted-seeds]]



Domain: Saga Related Flows
- [[jobs/job-refresh-saga-summary]] — triggers `rollingContext` refresh
- [[jobs/job-generate-batch]] — plans sagas before batch generation



Domain: Saga Related Domain Concepts
- [[domain/story]]
- [[domain/arc]]
- [[domain/planted-seed]]
- [[domain/context-tiers]]



Domain: Saga Implemented By
- `packages/db/src/schema/sagas.ts`
- `packages/core/src/config/generation.ts` — `LONG_FORM_CONFIG`
- [[agents/saga-planner]] — creates the saga plan
- [[prompts/prompt-saga-planner-v2]]

---

## story-bible

`domain/story-bible.md`

---
type: domain-concept
---



Domain: Story Bible Description
**Type:** Domain Concept
The story bible is the master reference document for a story's fictional world. It is generated once (before any chapters are written) and acts as the **HOT tier** of the context cache — stable, authoritative, and included in every chapter generation prompt. Once generated, it locks the story's genre and power system conventions. The bible can be versioned (updated), but each update increments the version number.



Domain: Story Bible Key Properties / Rules
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



Domain: Story Bible Related Database Tables
- [[database/tables/story-bibles]]
- [[database/tables/stories]] (`genreLockedAt`)



Domain: Story Bible Related Flows
- [[routes/bible]] — API route for bible management



Domain: Story Bible Related Domain Concepts
- [[domain/story]]
- [[domain/xianxia]]
- [[domain/context-tiers]]
- [[domain/character]]
- [[domain/bloodline]]
- [[domain/faction]]



Domain: Story Bible Implemented By
- `packages/db/src/schema/story-bibles.ts`
- [[agents/bible-generator]] — generates the initial bible
- [[prompts/prompt-bible-generator-v2]]
- [[prompts/contract-genre]] — genre rules injected from HOT tier

---

## story

`domain/story.md`

---
type: domain-concept
---



Domain: Story Description
**Type:** Domain Concept
A "story" is the top-level container for a novel project. It holds the core creative configuration — title, premise, genre, main character personality, tone, and target chapter count — and acts as the root entity that all other domain objects (sagas, arcs, chapters, characters, etc.) belong to.



Domain: Story Key Properties / Rules
- `title` — human-readable name of the story
- `premise` — one-paragraph description of the story's central conflict and world
- `genre` — selected from the genre catalog (e.g., `tien_hiep`); **locked after bible generation** (`genreLockedAt` timestamp set)
- `mainCharacterPersonality` — archetype from the personality catalog (e.g., `cuong_dao`, `linh_hoat`)
- `tone` — narrative tone descriptor (e.g., dark, hopeful, epic)
- `targetChapterCount` — integer 1–10000, default 1000
- `status` — lifecycle state: `created` → bible generated → sagas planned → arcs planned → chapters generated
- Genre lock prevents genre changes from invalidating an already-generated [[domain/story-bible]]
- Per-story config overrides (model routes, budget, context window sizes) are stored in `story_settings` and loaded via `getEffectiveConfig(storyId, provider)`



Domain: Story Lifecycle
1. `created` — story record created with title, premise, genre, personality
2. Bible generated — [[agents/bible-generator]] writes worldRules, power system, style guide; `genreLockedAt` is stamped
3. Sagas planned — [[agents/saga-planner]] divides the story into major divisions
4. Arcs planned — [[agents/arc-planner]] divides each saga into arcs
5. Chapters generated — [[jobs/job-generate-chapter]] runs the full pipeline per chapter



Domain: Story Related Database Tables
- [[database/tables/stories]]
- [[database/tables/story-settings]]



Domain: Story Related Flows
- [[jobs/job-generate-chapter]]
- [[jobs/job-generate-batch]]



Domain: Story Related Domain Concepts
- [[domain/story-bible]]
- [[domain/saga]]
- [[domain/arc]]
- [[domain/chapter]]
- [[domain/generation-mode]]
- [[domain/xianxia]]



Domain: Story Implemented By
- `packages/db/src/schema/stories.ts`
- `packages/core/src/config/generation.ts` — `GENERATION_CONFIG`, `LONG_FORM_CONFIG`
- `packages/ai/src/story-domain.ts` — `StoryDomainContext` loader
- `packages/core/src/catalog/genres.ts` — genre catalog
- `packages/core/src/catalog/personalities.ts` — personality catalog

---

## xianxia

`domain/xianxia.md`

---
type: domain-concept
---



Domain: Xianxia (Tiên Hiệp) Description
**Type:** Domain Concept
*Xianxia* (tiên hiệp — 仙俠, lit. "immortal hero") is the primary genre setting for the novel factory. It refers to Chinese-style cultivation fantasy fiction where characters pursue immortality through stages of spiritual/martial cultivation, wielding elemental powers, bloodline abilities, and sect politics as core dramatic elements. The Vietnamese reading community uses the term *tiên hiệp* (genre slug: `tien_hiep`).



Domain: Xianxia (Tiên Hiệp) Key Genre Conventions
- **Cultivation realms**: characters progress through a tiered system of spiritual levels (e.g., Qi Condensation → Foundation Establishment → Golden Core → Nascent Soul → …). The story bible defines the specific realm tiers via `cultivationSystem`.
- **Power system** (`powerSystemKind`): one of `cultivation | martial | ability | tech | urban | historical | horror | mystery | system | reincarnation | mixed | none`
- **Bloodlines** (*huyết mạch*): hereditary power lineages (see [[domain/bloodline]]); tracked by `bloodlineSystem` in the story bible
- **Sects / factions** (*môn phái*, *gia tộc*): organizations structuring the world's power landscape (see [[domain/faction]])
- **Realm jumping**: gaining more than 1 realm per chapter is forbidden; max 1 per arc — enforced by [[validators/check-realm-jump]]
- **Forbidden rules**: story-specific prohibitions stored in the [[domain/story-bible]] under `forbiddenRules`; enforced by [[validators/check-forbidden-move]]
- Genre is **locked** after [[domain/story-bible]] generation (`genreLockedAt` on the story record)



Domain: Xianxia (Tiên Hiệp) Character Personality Archetypes (from catalog)
Defined in `packages/core/src/catalog/personalities.ts`:
- `tram_on` — steady, composed, philosophical
- `cuong_dao` — ruthless, decisive, pragmatic
- `linh_hoat` — witty, adaptable, sharp
- `hanh_dong` — action-first, impulsive, loyal
- `tu_bi` — compassionate, self-sacrificing



Domain: Xianxia (Tiên Hiệp) Genre Contracts
- [[prompts/contract-genre]] — genre-specific writing rules injected into the HOT context tier
- [[prompts/contract-personality]] — personality-driven prose style rules
- [[prompts/contract-story-options]] — feature toggles (e.g., `enableHarem`, `enableReincarnation`)



Domain: Xianxia (Tiên Hiệp) Related Database Tables
- [[database/tables/stories]] (`genre` field, `genreLockedAt`)
- [[database/tables/story-bibles]] (`cultivationSystem`, `bloodlineSystem`, `powerSystemKind`)



Domain: Xianxia (Tiên Hiệp) Related Flows
- [[agents/bible-generator]] — generates the world rules and cultivation system



Domain: Xianxia (Tiên Hiệp) Related Domain Concepts
- [[domain/story]]
- [[domain/story-bible]]
- [[domain/character]]
- [[domain/bloodline]]
- [[domain/faction]]
- [[domain/context-tiers]]



Domain: Xianxia (Tiên Hiệp) Implemented By
- `packages/core/src/catalog/genres.ts` — genre definitions, slug `tien_hiep`
- `packages/core/src/catalog/personalities.ts` — personality archetypes
- `packages/core/src/catalog/story-options.ts` — feature toggles
- [[prompts/contract-genre]]

---
