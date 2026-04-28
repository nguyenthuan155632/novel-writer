# AI Novel Factory v2 — Design Spec

> **Status**: Approved design (2026-04-28). Supersedes `docs/specs/ai_novel_factory_codex_spec.md` (v1, kept for reference).
>
> **Goal**: Build a single-user local app that generates 500–1000 chapter Vietnamese xianxia/fantasy novels while preserving plot, character, power-system, and style consistency at low cost (~$0.007/chapter actual, $0.05/chapter hard cap).

---

## Table of Contents

1. [Core Architecture](#1-core-architecture)
2. [Data Model](#2-data-model)
3. [Agent Definitions](#3-agent-definitions)
4. [Context Builder & Retrieval](#4-context-builder--retrieval)
5. [Validation & Canon Reconciliation](#5-validation--canon-reconciliation)
6. [Token / Cost Model](#6-token--cost-model)
7. [Tech Stack & Build Order](#7-tech-stack--build-order)

---

## 1. Core Architecture

### 1.1 Guiding principles

```
The system remembers. The model writes.
The system also plans. The model only executes one scene.
The system caches. The model only reads what it needs to write THIS chapter.
```

### 1.2 Three-tier context cache

The system's central concept. Every prompt is built by stacking three tiers in a fixed order to maximize provider-side cache hits.

| Tier | Contents | Approx tokens | Lifespan | Cache strategy |
|------|----------|---------------|----------|----------------|
| **HOT** | System rules, bible_compact, style_guide, power_rules, style few-shots (2-3 sample paragraphs) | ~2.5K | Until user edits Bible | Identical prefix across all chapters in a story; bumped only via `bible.version` |
| **WARM** | Current saga rolling_summary, current arc rolling_summary, active characters (compact), arc open threads, arc planted seeds | ~2K | Until any of these bump version | Cached per arc; invalidated when `saga.summary_version`, `arc.summary_version`, or any `character.version` in active set changes |
| **COLD** | Recent chapter summaries, retrieved canon facts (top-K via pgvector), retrieved past chapters (when packet hints reference), planted seeds due this chapter, chapter packet | ~1-1.5K | Per chapter | Never cached; always fresh |

Total writer input ≈ 5.5–6K tokens; ~65–70% cached on average across a novel.

### 1.3 Pipeline overview

```
                    ┌─────────────────┐
User premise ─────► │ Story Bible Gen │ (1 lần / story)
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │  Saga Planner   │ (1 lần / story; refines every ~100 chapters)
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │  Arc Planner    │ (lazy: per-saga, refines as state evolves)
                    └────────┬────────┘
                             ▼
   ┌─── Chapter Loop (per chapter) ────────────────────┐
   │                                                    │
   │  Packet Gen ──► Packet Audit (deterministic) ──┐  │
   │       ▲                                         │  │
   │       └──── retry once with audit hints         │  │
   │                                                 ▼  │
   │  Context Builder (3-tier + retrieval)              │
   │       │                                            │
   │       ▼                                            │
   │  Writer Agent                                      │
   │       │                                            │
   │       ▼                                            │
   │  Deterministic Validator (regex/lookup) ──┐        │
   │       │ pass                  fail crit ──┘ STOP   │
   │       ▼                                            │
   │  LLM Validator (style/voice/soft logic)            │
   │       │                                            │
   │       ▼ pass / auto-fix-once / needs_review        │
   │  Canon Extractor                                   │
   │       │                                            │
   │       ▼                                            │
   │  Pending Canon Updates ──► Conflict Detector       │
   │       │                                            │
   │       ▼ none/warning → auto-merge                  │
   │       │ blocking → wait for user                   │
   │  Persist + bump versions + invalidate WARM cache   │
   │                                                    │
   └────────────────────────────────────────────────────┘
```

### 1.4 Differences vs v1 spec

1. **Packet goes through deterministic audit before reaching the writer** — catches errors cheaply.
2. **Validator is two-tier**: deterministic (code) first, LLM second.
3. **Canon updates do NOT write directly** — they go through `pending_canon_updates` with conflict detection.
4. **Planted seeds** are first-class entities (foreshadowing infrastructure).
5. **Style few-shots** live in HOT tier to compensate for Flash Lite's weaker prose voice.
6. **Hierarchical rolling summaries** (chapter → arc → saga) replace ad-hoc context inclusion.
7. **Editor agent removed**; polish only happens via Auto-Fixer when validator flags issues.

---

## 2. Data Model

PostgreSQL 16 + pgvector. ORM: Drizzle. Schema lives in `packages/db/src/schema/`.

### 2.1 Tables retained from v1 (unchanged structure)

`stories`, `factions`, `bloodlines`, `validations`, `llm_calls` — see v1 spec sections 5.1, 5.4, 5.5, 5.12, 16.

### 2.2 Tables modified

```sql
-- story_bibles: add versioning + style few-shots
ALTER TABLE story_bibles
  ADD COLUMN version INT DEFAULT 1,
  ADD COLUMN style_few_shots JSONB DEFAULT '[]';
-- style_few_shots: 2-3 sample paragraphs the user has marked as "voice canonical"

-- characters: add versioning + locked fields
ALTER TABLE characters
  ADD COLUMN version INT DEFAULT 1,
  ADD COLUMN locked_fields JSONB DEFAULT '[]';
-- locked_fields example: ["origin", "death_chapter"] — extractor cannot modify

-- chapters: add validation/cache tracking
ALTER TABLE chapters
  ADD COLUMN packet_audit_status TEXT DEFAULT 'pending',
  ADD COLUMN deterministic_validation JSONB,
  ADD COLUMN llm_validation_id UUID REFERENCES validations(id),
  ADD COLUMN context_cache_key TEXT;

-- arcs: add rolling summary + planted seed refs
ALTER TABLE arcs
  ADD COLUMN rolling_summary TEXT,
  ADD COLUMN planted_seed_ids JSONB DEFAULT '[]',
  ADD COLUMN summary_version INT DEFAULT 0;
```

### 2.3 New tables

```sql
-- sagas: separate from arcs for clarity (v1 collapsed them)
CREATE TABLE sagas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  saga_number INT NOT NULL,
  title TEXT NOT NULL,
  start_chapter INT,
  end_chapter INT,
  rolling_summary TEXT,           -- ~1K tok, regenerated every 20 chapters or on saga end
  summary_version INT DEFAULT 0,
  main_themes JSONB DEFAULT '[]',
  major_mysteries JSONB DEFAULT '[]',
  status TEXT DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(story_id, saga_number)
);

-- planted_seeds: foreshadowing infrastructure
CREATE TABLE planted_seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  seed_text TEXT NOT NULL,           -- the hint to plant: "Lam Trach glimpses a red-robed figure"
  payoff_description TEXT NOT NULL,  -- what this hint pays off: "She becomes his mentor in arc 4"
  plant_window_start INT NOT NULL,
  plant_window_end INT NOT NULL,
  payoff_chapter INT,
  planted_in_chapter INT,
  status TEXT DEFAULT 'pending',     -- pending | planted | paid_off | abandoned
  created_by_agent TEXT,             -- 'saga_planner' | 'arc_planner' | 'manual'
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON planted_seeds(story_id, status, plant_window_start);

-- pending_canon_updates: gate before merging into canon tables
CREATE TABLE pending_canon_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  update_type TEXT NOT NULL,         -- 'character' | 'canon_fact' | 'thread' | 'event'
  target_table TEXT NOT NULL,
  target_id UUID,                    -- NULL when this is a create
  payload JSONB NOT NULL,
  conflict_status TEXT DEFAULT 'none',     -- none | warning | blocking
  conflict_reasons JSONB DEFAULT '[]',
  resolution TEXT DEFAULT 'pending',       -- pending | auto_merged | user_approved | rejected
  reviewed_by TEXT,                        -- 'auto' | 'user'
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX ON pending_canon_updates(story_id, resolution, conflict_status);

-- chapter_summaries: per-chapter, embedded for retrieval
CREATE TABLE chapter_summaries (
  chapter_id UUID PRIMARY KEY REFERENCES chapters(id) ON DELETE CASCADE,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  short_summary TEXT NOT NULL,       -- ~200 tok for rolling summary input
  detailed_summary TEXT NOT NULL,    -- ~500 tok for audit/debug
  embedding vector(1536),            -- pgvector index over short_summary
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON chapter_summaries USING ivfflat (embedding vector_cosine_ops);

-- canon_facts: add embedding column (table exists from v1)
ALTER TABLE canon_facts ADD COLUMN embedding vector(1536);
CREATE INDEX ON canon_facts USING ivfflat (embedding vector_cosine_ops);

-- context_packets: log every built context for debug/replay
CREATE TABLE context_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  hot_tier_hash TEXT NOT NULL,
  warm_tier_hash TEXT NOT NULL,
  cold_payload JSONB NOT NULL,
  total_input_tokens INT,
  cached_input_tokens INT,
  config_snapshot JSONB,             -- effective config used for this build
  created_at TIMESTAMPTZ DEFAULT now()
);

-- prompt_versions: track agent prompt versions
CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_role TEXT NOT NULL,
  version TEXT NOT NULL,
  template TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_role, version)
);

-- story_settings: per-story config overrides
CREATE TABLE story_settings (
  story_id UUID PRIMARY KEY REFERENCES stories(id) ON DELETE CASCADE,
  overrides JSONB DEFAULT '{}',      -- deep-merged into CONTEXT_CONFIG/GENERATION_CONFIG
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 3. Agent Definitions

12 agents total. Two of them (Packet Auditor, Deterministic Validator) are **code-only**, no LLM call.

### 3.1 Roles & default model routing

| # | Role | Model | Cadence | Notes |
|---|------|-------|---------|-------|
| 1 | `bible_generator` | `google/gemini-2.5-pro` | 1× / story | Rare, important — use Pro |
| 2 | `saga_planner` | `google/gemini-2.5-pro` | Every ~100 chapters | Plus initial seeds generation |
| 3 | `arc_planner` | `google/gemini-2.5-flash` | Every ~20 chapters | Lazy per-saga |
| 4 | `packet_generator` | `google/gemini-2.5-flash-lite` | Every chapter | Structured output |
| 5 | `packet_auditor` | **Code only** | Every chapter | Deterministic checks vs canon |
| 6 | `writer` | `google/gemini-2.5-flash-lite` | Every chapter | Highest volume |
| 7 | `auto_fixer` | `google/gemini-2.5-flash-lite` | Only when validator fails low/med | Patch, not rewrite |
| 8 | `deterministic_validator` | **Code only** | Every chapter | Regex + DB lookup |
| 9 | `llm_validator` | `google/gemini-2.5-flash-lite` | Every chapter | Soft checks only |
| 10 | `canon_extractor` | `google/gemini-2.5-flash-lite` | Every chapter | Structured output |
| 11 | `summary_compactor` | `google/gemini-2.5-flash-lite` | Per chapter + periodic arc/saga | Hierarchical |
| 12 | `high_stakes_reviewer` | `google/gemini-2.5-pro` | Arc-end + critical issues | Pro model |

All model assignments are env-overridable (see Section 7.1 `MODEL_CONFIG`).

### 3.2 Per-agent specs (compact)

**Bible Generator** — Input: `{premise, genre, tone, target_chapters}` → Output: `{world_rules, cultivation_system, bloodline_system, style_guide, forbidden_rules, ending_direction, compact_summary}`. Structured. User reviews/edits before save.

**Saga Planner** — Input: `{bible_compact}` → Output: `{sagas[5-8], planted_seeds[10-30]}`. Seeds carry `plant_window_start/end` and `payoff_chapter`.

**Arc Planner** — Input: `{saga, current_state, unresolved_seeds_in_saga}` → Output: `{arcs[2-5], expected_changes, seeds_to_resolve_in_arc}`.

**Packet Generator** — Input: `{current_arc, recent_timeline, active_chars, open_threads, due_planted_seeds, overdue_threads}` → Output: `ChapterPacket`. **Must inject due seeds into `required_events`.**

**Packet Auditor** (code) — Checks packet against canon state:
- Realm jump > `MAX_REALM_JUMP_PER_CHAPTER` for any character?
- Listed characters with `status='dead'`?
- `forbidden_moves` collision with `bible.forbidden_rules`?
- `required_events` correctly resolves seeds locked to this chapter?
- At least one conflict + one cliffhanger present?

Returns `{pass, issues[], requires_regenerate}`. Fail → regenerate packet once with issues as hints; second fail → mark `needs_review`.

**Writer Agent** — Input: `ChapterContext` → Output: `{title, content}`. Prompt structure (Section 4.5).

**Auto-Fixer** — Triggered only when LLM validator fails with severity `low|medium`, max 1 attempt. Prompt: "Apply ONLY the requested fixes. Do not change anything else. Preserve every other paragraph as-is."

**Deterministic Validator** (code) — Runs before LLM validator. Severity-tagged checks; critical fail short-circuits and skips LLM validator. See Section 5.2.

**LLM Validator** — Input: `{chapter, context}` (sharing HOT prefix with Writer for cache hit) → Output: `{pass, severity, issues[]}`. Checks soft issues only: voice, plot logic, style match.

**Canon Extractor** — Input: `{chapter_content, current_canon_state_compact}` → Output: structured extraction. **Writes to `pending_canon_updates`, never to canon tables directly.**

**Summary Compactor** — Multiple cadences:
- Per-chapter summary: runs after extractor (200 + 500 tok outputs)
- Arc rolling summary: regenerated every `ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` (default 5)
- Saga rolling summary: regenerated every `SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS` (default 20)

**High-Stakes Reviewer** — Triggers:
- End of arc (`HIGH_STAKES_REVIEW_AT_ARC_END=true`)
- LLM validator severity = `critical`
- Manual user trigger
Reads full chapter + arc summary + bible. Output: `{approve, concerns, recommended_actions}`.

### 3.3 Structured Output

All non-text agent outputs use Gemini `responseSchema` (JSON mode). Schemas live in `packages/ai/schemas/*.ts` and are shared with frontend via `packages/core/types`.

### 3.4 Prompt versioning

Each agent prompt has a `version` row in `prompt_versions`. Every LLM call logs `prompt_version` to `llm_calls`. Enables A/B testing prompt revisions.

---

## 4. Context Builder & Retrieval

The most leverage-heavy component. Lives in `packages/ai/src/context/`.

### 4.1 ChapterContext shape

```ts
type ChapterContext = {
  hot: HotTier;        // ~2.5K tok — cached
  warm: WarmTier;      // ~2K tok — cached per arc
  cold: ColdTier;      // ~1.5K tok — fresh
  meta: {
    storyId: string;
    chapterNumber: number;
    arcId: string;
    hotHash: string;
    warmHash: string;
    targetInputBudget: number;
  };
};

type HotTier = {
  systemRules: string;        // ~200 tok
  bibleCompact: string;       // ~800 tok
  styleGuide: string;         // ~400 tok
  powerRules: string;         // ~400 tok
  styleFewShots: string[];    // 2-3 paragraphs, ~200 tok each
};

type WarmTier = {
  sagaSummary: string;        // ~500-1000 tok
  arcSummary: string;         // ~500 tok
  activeCharacters: CharacterCompact[];  // ~50-100 tok each
  arcOpenThreads: ThreadCompact[];
  arcPlantedSeeds: SeedCompact[];
};

type ColdTier = {
  recentSummaries: ChapterSummaryCompact[];      // last 5 chapter short_summary
  retrievedFacts: CanonFactCompact[];            // top-K via pgvector
  retrievedPastChapters: ChapterSummaryCompact[]; // top-K when packet hints reference past
  seedsToPlantNow: PlantedSeed[];
  packet: ChapterPacket;
};
```

### 4.2 Cache key computation

```ts
function computeHotHash(bible: StoryBible): string {
  return sha256([
    bible.version,
    bible.compact_summary,
    bible.style_guide,
    bible.cultivation_system,
    bible.forbidden_rules,
    JSON.stringify(bible.style_few_shots),
  ].join('::'));
}

function computeWarmHash(saga: Saga, arc: Arc, activeChars: Character[]): string {
  return sha256([
    `saga:${saga.id}:${saga.summary_version}`,
    `arc:${arc.id}:${arc.summary_version}`,
    activeChars.map(c => `${c.id}:${c.version}`).sort().join(','),
  ].join('::'));
}
```

**Invalidation:**
- `hotHash` changes only when user edits Bible (`bible.version` bumps)
- `warmHash` changes when `saga.summary_version`, `arc.summary_version`, or any active `character.version` bumps
- After canon merger applies updates → bumps relevant versions → next chapter sees fresh WARM cache

### 4.3 COLD tier retrieval algorithm

```ts
async function buildColdTier(packet: ChapterPacket, storyId: string): Promise<ColdTier> {
  const recentSummaries = await db.chapter_summaries
    .where({ storyId })
    .orderBy('chapter_number', 'desc')
    .limit(CONTEXT_CONFIG.RECENT_CHAPTER_SUMMARIES_COUNT);

  const packetEmbed = await embed(packetToQueryString(packet));
  const retrievedFacts = await db.canon_facts
    .where({ storyId })
    .where('importance', 'in', CONTEXT_CONFIG.RETRIEVAL_MIN_IMPORTANCE)
    .orderByCosineDistance(packetEmbed)
    .limit(CONTEXT_CONFIG.RETRIEVED_CANON_FACTS_TOP_K);

  let retrievedPastChapters: ChapterSummaryCompact[] = [];
  if (packetReferencesPast(packet)) {
    retrievedPastChapters = await db.chapter_summaries
      .where({ storyId })
      .where('chapter_number', '<', packet.chapter_number - CONTEXT_CONFIG.RETRIEVED_PAST_CHAPTERS_MIN_GAP)
      .orderByCosineDistance(packetEmbed)
      .limit(CONTEXT_CONFIG.RETRIEVED_PAST_CHAPTERS_TOP_K);
  }

  const seedsToPlantNow = await db.planted_seeds
    .where({ storyId, status: 'pending' })
    .where('plant_window_start', '<=', packet.chapter_number)
    .where('plant_window_end', '>=', packet.chapter_number);

  return { recentSummaries, retrievedFacts, retrievedPastChapters, seedsToPlantNow, packet };
}
```

`packetReferencesPast` uses regex matching against `CONTEXT_CONFIG.PAST_REFERENCE_KEYWORDS` plus heuristic checks for character/location names not seen in recent 5 chapters. Switchable to LLM classifier via `PAST_REFERENCE_USE_LLM_CLASSIFIER`.

### 4.4 Token budget enforcement (shrink ladder)

When assembled context exceeds budget:

```ts
const SHRINK_ORDER = [
  'retrievedPastChapters',     // first to drop
  'retrievedFacts',
  'recentSummaries',
  'activeCharactersCompactMode',  // strip optional fields
];
// HOT is never shrunk; if budget still exceeded → throw + log for human review
```

### 4.5 Serialization order (CRITICAL for cache hits)

Gemini matches cache prefix left-to-right. Required order — never deviate:

```
[HOT]
1. systemRules
2. bibleCompact
3. styleGuide
4. powerRules
5. styleFewShots

[WARM]
6. sagaSummary
7. arcSummary
8. activeCharacters (sorted by id)
9. arcOpenThreads (sorted)
10. arcPlantedSeeds (sorted)

[COLD]
11. recentSummaries
12. retrievedFacts
13. retrievedPastChapters
14. seedsToPlantNow
15. packet

[INSTRUCTION]
16. "Write chapter {N}. Output: Title + Content only."
```

**Wrong order = cache miss = 4× cost.**

### 4.6 Public interface

```ts
// packages/ai/src/context/builder.ts
export interface ContextBuilder {
  build(params: {
    storyId: string;
    chapterNumber: number;
    arcId: string;
    chapterPacketId: string;
    importance?: 'normal' | 'important';
  }): Promise<{
    context: ChapterContext;
    serialized: string;
    cacheKey: string;            // hotHash + warmHash
    estimatedInputTokens: number;
    contextPacketId: string;     // saved to context_packets
  }>;
}
```

### 4.7 Configuration constants

All tunable parameters live in `packages/core/src/config/`. Per-story overrides via `story_settings.overrides` (deep-merged at runtime).

```ts
// packages/core/src/config/context.ts
export const CONTEXT_CONFIG = {
  TOKEN_BUDGET_NORMAL: 6000,
  TOKEN_BUDGET_IMPORTANT: 10000,
  TOKEN_BUDGET_HOT_TARGET: 2500,
  TOKEN_BUDGET_WARM_TARGET: 2000,
  TOKEN_BUDGET_COLD_TARGET: 1500,

  RECENT_CHAPTER_SUMMARIES_COUNT: 5,
  RETRIEVED_CANON_FACTS_TOP_K: 8,
  RETRIEVED_PAST_CHAPTERS_TOP_K: 3,
  RETRIEVED_PAST_CHAPTERS_MIN_GAP: 5,
  RETRIEVAL_MIN_IMPORTANCE: ['high', 'locked'],

  STYLE_FEWSHOT_COUNT: 3,
  STYLE_FEWSHOT_MAX_TOKENS_EACH: 250,

  ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS: 5,
  SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS: 20,
  CHAPTER_SHORT_SUMMARY_TARGET_TOKENS: 200,
  CHAPTER_DETAILED_SUMMARY_TARGET_TOKENS: 500,

  PAST_REFERENCE_KEYWORDS: ['lần trước', 'trước đây', 'năm xưa', 'thuở nhỏ', 'kiếp trước', 'callback'],
  PAST_REFERENCE_USE_LLM_CLASSIFIER: false,

  SHRINK_ORDER: [
    'retrievedPastChapters',
    'retrievedFacts',
    'recentSummaries',
    'activeCharactersCompactMode',
  ] as const,
} as const;
```

```ts
// packages/core/src/config/generation.ts
export const GENERATION_CONFIG = {
  CHAPTER_TARGET_WORDS_MIN: 2000,
  CHAPTER_TARGET_WORDS_MAX: 3000,
  CHAPTER_HARD_FAIL_WORDS_MIN: 1500,
  CHAPTER_HARD_FAIL_WORDS_MAX: 4000,

  MAX_REALM_JUMP_PER_CHAPTER: 1,
  MAX_REALM_JUMP_PER_ARC: 1,
  MAX_NEW_BLOODLINES_PER_ARC: 2,

  PACKET_REGENERATE_MAX_ATTEMPTS: 1,
  WRITER_RETRY_ON_API_ERROR: 3,
  AUTO_FIX_MAX_ATTEMPTS: 1,
  AUTO_FIX_TRIGGER_SEVERITIES: ['low', 'medium'] as const,
  STOP_SEVERITIES: ['high', 'critical'] as const,

  DETERMINISTIC_VALIDATOR_BLOCKING_ON_FAIL: true,
  LLM_VALIDATOR_TEMPERATURE: 0.1,
  WRITER_TEMPERATURE: 0.85,
  WRITER_TOP_P: 0.95,

  SAFE_MODE_BATCH_SIZE: 1,
  SEMI_AUTO_BATCH_SIZE: 5,
  FULL_AUTO_BATCH_SIZE: 30,

  HIGH_STAKES_REVIEW_AT_ARC_END: true,
  HIGH_STAKES_REVIEW_ON_CRITICAL: true,

  // Mode escalation: while in semi_auto, force safe_mode for these
  AUTO_ESCALATE_TO_SAFE_MODE: {
    FIRST_CHAPTER_OF_STORY: true,
    FIRST_CHAPTER_OF_ARC: true,
    LAST_CHAPTER_OF_ARC: true,
    ON_VALIDATOR_HIGH: true,
    ON_VALIDATOR_CRITICAL: true,
    ON_BLOCKING_CONFLICT: true,
  },
} as const;
```

```ts
// packages/core/src/config/models.ts
export const MODEL_CONFIG = {
  routes: {
    bible_generator: process.env.BIBLE_MODEL ?? 'google/gemini-2.5-pro',
    saga_planner: process.env.SAGA_PLANNER_MODEL ?? 'google/gemini-2.5-pro',
    arc_planner: process.env.ARC_PLANNER_MODEL ?? 'google/gemini-2.5-flash',
    packet_generator: process.env.PACKET_MODEL ?? 'google/gemini-2.5-flash-lite',
    writer: process.env.WRITER_MODEL ?? 'google/gemini-2.5-flash-lite',
    auto_fixer: process.env.FIXER_MODEL ?? 'google/gemini-2.5-flash-lite',
    llm_validator: process.env.VALIDATOR_MODEL ?? 'google/gemini-2.5-flash-lite',
    canon_extractor: process.env.EXTRACTOR_MODEL ?? 'google/gemini-2.5-flash-lite',
    summary_compactor: process.env.COMPACTOR_MODEL ?? 'google/gemini-2.5-flash-lite',
    high_stakes_reviewer: process.env.HIGH_STAKES_MODEL ?? 'google/gemini-2.5-pro',
  },
  pricing: {
    'google/gemini-2.5-flash-lite': { input: 0.10, cachedInput: 0.025, output: 0.40 },
    'google/gemini-2.5-flash':      { input: 0.30, cachedInput: 0.075, output: 2.50 },
    'google/gemini-2.5-pro':        { input: 1.25, cachedInput: 0.31,  output: 10.00 },
  },
} as const;
```

```ts
// packages/core/src/config/budget.ts
export const BUDGET_GUARDRAILS = {
  PER_CHAPTER_HARD_CAP_USD: 0.05,
  PER_STORY_DAILY_CAP_USD: 5.0,
  PER_STORY_MONTHLY_CAP_USD: 50.0,
  ALERT_THRESHOLD_PERCENT: 80,
} as const;
```

Helper `getEffectiveConfig(storyId)` merges `default ← env ← story_overrides`.

### 4.8 Logging

Every context build saves a row to `context_packets` including `config_snapshot` of effective config used. Enables replay and "why did chapter X differ" debugging.

---

## 5. Validation & Canon Reconciliation

### 5.1 Validation flow

```
Chapter content from Writer
          │
          ▼
[TIER 1] Deterministic Validator   (code, ~10ms, $0)
          │
   ┌──────┴───────┐
pass│         fail│
    │   ┌─────────┴───────────┐
    │   │ critical → STOP, mark needs_review
    │   │ low/med  → continue to TIER 2
    ▼   ▼
[TIER 2] LLM Validator   (Flash Lite, ~$0.0004)
          │
   ┌──────┴────────────────────┐
pass│                       fail│ (severity check)
    │              ┌────────────┴────────┐
    │           low/med               high/critical
    │              │                      │
    │              ▼                      ▼
    │        Auto-Fixer (1×) → re-run    STOP, mark needs_review
    │              │                      (optional High-Stakes Reviewer)
    │         pass / fail
    ▼              ▼
Canon Extractor / needs_review
```

### 5.2 Tier 1 — Deterministic Validator (code)

Lives in `packages/ai/src/validators/deterministic/`. Each check is a pure function with full unit-test coverage.

```ts
type DeterministicCheck = {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  run(input: { content: string; context: ChapterContext; chapter: Chapter; story: Story }): {
    pass: boolean;
    issues: string[];
  };
};

const CHECKS: DeterministicCheck[] = [
  // CRITICAL — block immediately
  wordCountCheck,                    // outside [HARD_FAIL_MIN, HARD_FAIL_MAX]
  deadCharacterAppearanceCheck,
  realmJumpCheck,
  lockedFactContradictionCheck,
  forbiddenMoveRegexCheck,

  // HIGH
  unknownCharacterNameCheck,
  unknownLocationCheck,
  newBloodlineWithoutSourceCheck,

  // MEDIUM
  wordCountSoftRangeCheck,           // outside [TARGET_MIN, TARGET_MAX]
  cliffhangerPresenceCheck,
  conflictPresenceCheck,

  // LOW
  styleRedFlagsCheck,                // configurable cliché patterns
  repetitionCheck,
];
```

### 5.3 Tier 2 — LLM Validator

Prompt structure shares HOT prefix with Writer for cache hit. Skips checks already covered by deterministic. Output schema: `{pass, severity: 'low'|'medium'|'high'|'critical', issues: [{type, description, suggested_fix}]}`.

### 5.4 Auto-Fixer

- Triggered only when LLM validator severity ∈ `AUTO_FIX_TRIGGER_SEVERITIES` (`low`, `medium`)
- Max 1 attempt
- Prompt requires patch-style edit ("preserve every other paragraph as-is"), not full rewrite
- Re-runs both validation tiers after; if still fails → mark `needs_review`

### 5.5 Canon Reconciliation

```
Canon Extractor output
        │
        ▼
[Write to pending_canon_updates]   resolution='pending'
        │
        ▼
[Conflict Detector (code)]         per-row check
        │
        ▼
[Categorize: none | warning | blocking]
        │
        ├──► none/warning + auto-merge enabled → apply to canon, bump versions
        └──► blocking → wait for user via /pending UI
```

### 5.6 Conflict Detector rules

| Update type | Rule | Severity |
|-------------|------|----------|
| character | Field listed in `character.locked_fields` | blocking |
| character | `current_realm` regress without `intentional_regression=true` | blocking |
| character | `status='dead'` already set previously | warning (idempotent) |
| character | New bloodline without corresponding event in `new_events` | warning |
| canon_fact | Cosine sim > 0.9 with existing fact AND wording opposite (negation detection) | blocking |
| canon_fact | New `locked: true` fact conflicts with existing locked fact on same topic | blocking |
| thread | `action: 'resolve'` but `planned_resolution_chapter` > 50 chapters away | warning |
| thread | Thread referenced doesn't exist | blocking |
| event | Always merge (events are append-only) | none |

### 5.7 Mode-based merge policy

| Mode | none | warning | blocking |
|------|------|---------|----------|
| safe | Wait for user | Wait for user | Wait for user |
| semi_auto (default) | Auto-merge | Auto-merge + flag in UI | Wait for user |
| full_auto | Auto-merge | Auto-merge | Pause pipeline |

**Auto-escalation to safe_mode** (per `AUTO_ESCALATE_TO_SAFE_MODE` config) for:
- First chapter of story
- First/last chapter of any arc
- LLM validator severity = `high` or `critical`
- Any blocking conflict in pending updates

### 5.8 Locked fields management

Auto-suggest, one-click confirm:
- When extractor outputs `importance: 'locked'`, conflict detector flags the relevant field for locking
- UI shows banner: "🔒 Lock field `X` on `Character Y`? [Lock] [Skip]"
- Default behavior is NOT to auto-lock (avoids trapping the user)
- Bulk lock available from `/stories/:id/canon`

### 5.9 UI surface

`/stories/:id/pending` route:
- Group by chapter
- Per-row: type, target, payload diff (old → new), conflict reasons
- Actions: Approve / Reject / Edit-then-approve
- Bulk-approve all `none/warning` for a chapter
- After approve: apply + bump version + re-trigger queue for next chapter (if waiting)

### 5.10 Version bump rules (recap, affects cache)

After successful merge:
- `character.version++` → invalidates WARM cache for following chapters
- `arc.summary_version++` when summary compactor regenerates arc summary
- `saga.summary_version++` when saga summary regenerates
- `bible.version++` only when user edits bible (never automatic)

---

## 6. Token / Cost Model

### 6.1 Per-chapter cost (semi_auto mode, no fix needed)

Assumes Gemini caching works (70% input cached for writer/validator).

| Call | Input | %Cached | Output | Cost |
|------|-------|---------|--------|------|
| Packet generator | 1.5K | 0% | 500 | $0.00035 |
| Writer | 6K | 70% | 4.5K | $0.00208 |
| LLM Validator | 6K | 70% | 300 | $0.00040 |
| Canon Extractor | 5K | 50% | 800 | $0.00063 |
| Summary Compactor | 5K | 0% | 700 | $0.00078 |
| **Subtotal base** | | | | **$0.00425** |

### 6.2 Amortized periodic calls

| Job | Cadence | Model | Per-chapter |
|-----|---------|-------|-------------|
| Bible generator | 1× / story (over 1000ch) | Pro | $0.00005 |
| Saga planner | every 100ch | Pro | $0.00036 |
| Arc planner | every 20ch | Flash | $0.00037 |
| Arc summary refresh | every 5ch | Lite | $0.00012 |
| Saga summary refresh | every 20ch | Lite | $0.00005 |
| Embeddings | every chapter | embed-small | $0.00001 |
| **Periodic subtotal** | | | **$0.00096** |

### 6.3 Failure overhead (expected)

| Event | Probability | Cost when triggered | Per-chapter expected |
|-------|-------------|---------------------|----------------------|
| Auto-fix + re-validate | 15% | $0.00240 | $0.00036 |
| High-Stakes Review | 5% | $0.02000 | $0.00100 |
| **Failure subtotal** | | | **$0.00136** |

### 6.4 Total

```
Base                  $0.00425
Periodic amortized    $0.00096
Failure overhead      $0.00136
─────────────────────────────
TOTAL per chapter     $0.00657   (~$0.007)
```

vs hard cap `$0.05/chapter` → uses ~13% of budget; **7-8× headroom**.

### 6.5 Whole-novel projection

| Chapters | Best case (cache OK) | Worst case (no cache) | Buffer +30% |
|----------|----------------------|------------------------|-------------|
| 100 | $0.66 | $0.85 | $1.10 |
| 500 | $3.30 | $4.25 | $5.50 |
| 1000 | **$6.60** | **$8.50** | **$11.00** |

### 6.6 Caching risk (OpenRouter)

Gemini has two caching modes:
- **Implicit caching** (Google AI Studio direct): automatic for prefix ≥ 1024 tokens identical
- **Explicit caching** (Vertex API): create cached content object with TTL

OpenRouter pass-through behavior is **not yet verified**. Three scenarios:
1. **Best**: caching passes through → costs as in 6.1
2. **Medium**: no caching → ~$0.008/chapter (still under budget)
3. **Worst**: full charges → ~$0.012/chapter (still 4× under budget)

**Mitigation**: build assuming worst case. Log `cached_input_tokens` from API responses into `llm_calls.cached_input_tokens`. If cache miss rate stays high, fall back to Google Direct provider.

Provider abstraction in `packages/ai/src/providers/` makes swap trivial:
```ts
interface LLMProvider {
  complete(req: CompletionRequest): Promise<CompletionResponse>;
  createCachedContent?(content: CachedContentSpec): Promise<CacheHandle>;
}
// implementations: openrouter.ts, google-direct.ts
```

### 6.7 Cost guardrails

```ts
export const BUDGET_GUARDRAILS = {
  PER_CHAPTER_HARD_CAP_USD: 0.05,
  PER_STORY_DAILY_CAP_USD: 5.0,
  PER_STORY_MONTHLY_CAP_USD: 50.0,
  ALERT_THRESHOLD_PERCENT: 80,
};
```

Worker checks before each chapter generation; if projected to exceed cap → pause job, surface in UI.

---

## 7. Tech Stack & Build Order

### 7.1 Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Monorepo | pnpm workspaces (already scaffolded) | Keep |
| Frontend | Next.js 15 App Router (`apps/web`) | Already scaffolded |
| Backend API | Fastify (`apps/api`) | Lighter than Nest for single-user; less boilerplate |
| Worker | BullMQ + Redis (`apps/worker`) | Standard for background jobs |
| DB | PostgreSQL 16 + pgvector | Native vector support |
| ORM | Drizzle | Close-to-SQL, type-safe migrations, no codegen |
| LLM gateway | OpenRouter (default) + Google Direct (fallback) | Provider abstraction |
| Embeddings | `text-embedding-3-small` via OpenRouter | $0.02/1M, sufficient for VN |
| Auth | None (local single-user) | env-based dev token if needed later |
| Deployment | Local Docker Compose | Railway/Fly later if desired |

### 7.2 Folder structure

```
novel-writer/
├── apps/
│   ├── api/                       # Fastify HTTP API
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── stories.ts
│   │       │   ├── chapters.ts
│   │       │   ├── pending-updates.ts
│   │       │   ├── seeds.ts
│   │       │   ├── settings.ts
│   │       │   └── costs.ts
│   │       └── server.ts
│   ├── web/                       # Next.js UI
│   │   └── app/
│   │       └── stories/[id]/
│   │           ├── bible/
│   │           ├── characters/
│   │           ├── sagas/
│   │           ├── arcs/
│   │           ├── chapters/[n]/
│   │           ├── pending/
│   │           ├── seeds/
│   │           ├── timeline/
│   │           ├── canon/
│   │           ├── costs/
│   │           └── settings/
│   └── worker/                    # BullMQ workers
│       └── src/
│           ├── jobs/
│           │   ├── generate-chapter.ts
│           │   ├── refresh-arc-summary.ts
│           │   ├── refresh-saga-summary.ts
│           │   ├── plan-arc.ts
│           │   └── high-stakes-review.ts
│           └── index.ts
├── packages/
│   ├── core/
│   │   └── src/
│   │       ├── config/
│   │       │   ├── context.ts
│   │       │   ├── generation.ts
│   │       │   ├── models.ts
│   │       │   └── budget.ts
│   │       ├── types/
│   │       └── utils/
│   ├── db/
│   │   └── src/
│   │       ├── schema/             # Drizzle table definitions
│   │       ├── migrations/
│   │       └── client.ts
│   └── ai/
│       └── src/
│           ├── providers/
│           │   ├── openrouter.ts
│           │   ├── google-direct.ts
│           │   └── types.ts
│           ├── agents/
│           │   ├── bible-generator.ts
│           │   ├── saga-planner.ts
│           │   ├── arc-planner.ts
│           │   ├── packet-generator.ts
│           │   ├── writer.ts
│           │   ├── auto-fixer.ts
│           │   ├── llm-validator.ts
│           │   ├── canon-extractor.ts
│           │   ├── summary-compactor.ts
│           │   └── high-stakes-reviewer.ts
│           ├── validators/
│           │   ├── deterministic/
│           │   │   ├── word-count.ts
│           │   │   ├── realm-jump.ts
│           │   │   ├── dead-character.ts
│           │   │   ├── locked-fact.ts
│           │   │   ├── forbidden-move.ts
│           │   │   ├── unknown-character.ts
│           │   │   ├── unknown-location.ts
│           │   │   ├── new-bloodline-source.ts
│           │   │   ├── cliffhanger.ts
│           │   │   ├── conflict-presence.ts
│           │   │   ├── style-red-flags.ts
│           │   │   └── repetition.ts
│           │   └── packet-auditor.ts
│           ├── reconciliation/
│           │   ├── conflict-detector.ts
│           │   └── canon-merger.ts
│           ├── context/
│           │   ├── builder.ts
│           │   ├── tiers.ts
│           │   ├── retrieval.ts
│           │   ├── cache-keys.ts
│           │   └── shrink.ts
│           ├── schemas/             # Zod / JSON schemas for structured outputs
│           └── prompts/             # Prompt templates + version tracking
└── docs/
    ├── specs/
    │   └── ai_novel_factory_codex_spec.md (v1, reference only)
    └── superpowers/
        ├── specs/
        │   └── 2026-04-28-ai-novel-factory-v2-design.md (THIS DOC)
        └── plans/
```

### 7.3 Testing strategy

| Layer | Tool | Coverage target |
|-------|------|-----------------|
| Deterministic validators | Vitest unit | 100% |
| Packet auditor | Vitest unit | 100% |
| Conflict detector | Vitest unit | 100% |
| Context builder (tier assembly, shrink, cache key) | Vitest unit | >80% |
| Retrieval | Vitest integration with pgvector test container | smoke |
| Agents (LLM calls) | **Mocked provider**, verify prompt structure + response handling | smoke |
| Worker jobs | Integration test with real Redis test container | golden path |
| API routes | Fastify inject + supertest | golden path |
| E2E | Playwright (optional) | critical flow only |

**Anything testable without an LLM call MUST have a test.** LLM-dependent code uses fixture responses; live API tests gated behind `RUN_LIVE_LLM=1` env flag AND user confirmation.

### 7.4 Observability

- **Structured logging**: Pino (built-in with Fastify)
- **Request tracing**: each chapter generation gets a `trace_id` flowing through API → queue → workers → LLM calls → DB
- **Metrics dashboard** at `/admin`:
  - Cache hit rate per tier
  - Cost/chapter 7-day rolling
  - Validator failure breakdown (by check id)
  - Auto-fix success rate
  - Pending canon updates aging

### 7.5 Build order (logical groupings, not time-phased)

The user has chosen to build the entire system in a single development cycle. The implementation plan (produced by the writing-plans skill next) should sequence work in this order to minimize rework:

**Group A — Foundation** (no LLM dependencies)
1. Drizzle schema + migrations for all 20 tables (13 from v1 + 7 new in v2)
2. Provider abstraction interface + OpenRouter implementation + Google Direct implementation (no live calls in tests)
3. Configuration loader (`getEffectiveConfig`)
4. Logging + tracing infra
5. Cost/usage logging service

**Group B — Code-only logic** (testable without LLM)
6. All deterministic validators (13 checks across 12 files; word-count.ts hosts both hard and soft range checks) with full unit-test coverage
7. Packet auditor with unit tests
8. Conflict detector with unit tests
9. Cache key computation + serialization order helper
10. Token shrink ladder
11. Canon merger (with version bump)

**Group C — Context & retrieval** (uses LLM only for embeddings)
12. Embedding service wrapper
13. Context builder (HOT + WARM + COLD assembly)
14. Retrieval implementations (recent summaries, top-K facts, past chapters)
15. Past-reference detection heuristic

**Group D — LLM agents** (uses LLM for generation; **mocked in tests**)
16. Bible generator
17. Saga planner
18. Arc planner
19. Packet generator
20. Writer agent
21. Auto-fixer
22. LLM validator
23. Canon extractor
24. Summary compactor
25. High-stakes reviewer

**Group E — Orchestration**
26. BullMQ job definitions (`generate-chapter`, `refresh-arc-summary`, etc.)
27. Chapter generation orchestrator (full pipeline)
28. Mode escalation logic (semi_auto → safe_mode triggers)
29. Cost guardrail enforcement

**Group F — API**
30. Fastify routes for all entities (stories, chapters, pending updates, seeds, settings, costs)
31. SSE/polling endpoint for chapter generation status

**Group G — UI**
32. Story list + create
33. Bible view/edit
34. Characters CRUD
35. Sagas/Arcs CRUD
36. Chapter view + generate trigger
37. Pending updates approval UI
38. Planted seeds dashboard
39. Timeline view
40. Canon facts view (with locked toggle)
41. Cost dashboard
42. Story settings (config overrides)
43. Style few-shots upload UI

**Group H — Polish**
44. Admin metrics dashboard
45. EPUB/Markdown export
46. Documentation

### 7.6 Non-negotiable invariants

1. **Every LLM call** is logged to `llm_calls` (model, tokens, cost, prompt_version)
2. **Every context build** is logged to `context_packets`
3. **No hard-coded model names** in agent code — only via `MODEL_CONFIG.routes`
4. **All tunable config** lives in `packages/core/src/config/` — no scattered constants
5. **Critical deterministic validator failure** blocks the LLM validator call
6. **Canon writes** flow only through `reconciliation/canon-merger.ts` — never raw `db.update(characters)` from extractor
7. **Cache prefix order** never changes between calls within the same story
8. **No live LLM API calls** during development without explicit user consent (tests use mocked providers; live tests gated behind `RUN_LIVE_LLM=1` AND user confirmation)

### 7.7 Out of scope (explicit non-goals)

- Multi-user / billing / SaaS
- Multi-language stories within a single project
- Image generation (cover, illustrations)
- Audio narration
- Reader-facing app (will be a separate project)
- Translation export
- Automated A/B testing of prompt versions in UI (infra exists; UI later)
- Continuous fine-tuning

---

## Appendix A — Glossary

- **Bible** — Foundational document defining the story's world rules, cultivation system, style, and forbidden moves. Created once per story; rarely edited.
- **Saga** — A 100–200 chapter "season" of the story, with its own theme and major mysteries.
- **Arc** — A 10–30 chapter self-contained storyline within a saga.
- **Chapter Packet** — A structured plan for a single chapter (goal, required events, characters, conflict, cliffhanger, forbidden moves) generated by the Packet Generator.
- **Canon** — The authoritative state of the story: characters, factions, bloodlines, threads, facts, timeline events.
- **Planted Seed** — A foreshadowing hint scheduled to be written into a chapter window with a planned payoff in a later chapter.
- **HOT/WARM/COLD tier** — The three layers of context cache by lifespan.
- **Pending Canon Update** — An extraction proposal awaiting conflict detection and (if blocking) user approval before merging into canon tables.
- **Locked field** — A character/canon field that the extractor is forbidden from modifying without explicit user override.

---

## Appendix B — Decisions log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-28 | Default mode: `semi_auto` with auto-escalation to `safe_mode` for high-stakes events | Reduces user fatigue while preserving safety gates |
| 2026-04-28 | Locked fields: auto-suggest, one-click confirm (no full auto-lock) | Avoids trapping user in over-restrictive state |
| 2026-04-28 | Drizzle over Prisma | Type-safe SQL, less boilerplate, better migration ergonomics |
| 2026-04-28 | Build all groups in one cycle (no time-phased MVP) | User preference for completeness over incremental delivery |
| 2026-04-28 | Editor agent removed; polish only via Auto-Fixer when validator flags issues | Avoid unnecessary LLM calls; let validator drive intervention |
| 2026-04-28 | Default writer model: `google/gemini-2.5-flash-lite` | Fits $0.05/chapter budget with massive headroom; user will swap to Flash if VN quality insufficient |
