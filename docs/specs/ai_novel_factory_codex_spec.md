# AI Novel Factory — Codex Implementation Spec

> Goal: Build a full-auto / semi-auto system that can generate a long-running xianxia / fantasy novel of 500–1000 chapters while preserving plot memory, character continuity, power scaling, open mysteries, and style consistency.

## 0. Core Philosophy

Do **not** build a chatbot that writes chapters.

Build a **canon database + agent pipeline**. The LLM should not be expected to remember the story. The application stores canon, retrieves the relevant context, writes one unit of story, validates it, extracts memory updates, and persists the updates.

Key rule:

```text
The system remembers. The model writes.
```

---

## 1. Product Modes

### 1.1 Safe Mode
Generate one chapter at a time and wait for human approval.

Use for:
- Beginning of the novel
- Major plot twists
- Arc endings
- New power-system introductions

### 1.2 Semi Auto Mode — Recommended Default
Generate 3–5 chapters as a batch, validate them, and wait for human approval.

Use for:
- Normal production
- Medium-risk story progression
- Maintaining quality/cost balance

### 1.3 Full Auto Mode
Generate a full arc, usually 20–50 chapters, and only stop if validation fails.

Use carefully. Full auto can produce smooth but generic chapters if not monitored.

---

## 2. Recommended Tech Stack

```text
Frontend: Next.js
Backend: Node.js / NestJS or Fastify
Database: PostgreSQL
Vector Search: pgvector
Queue: BullMQ + Redis
Storage: S3 / Cloudflare R2 / local filesystem for drafts
LLM: OpenAI Responses API
ORM: Prisma or Drizzle
Auth: Optional for MVP
```

Official OpenAI references to check during implementation:
- Responses API / API docs: https://developers.openai.com/api/docs
- Structured Outputs: https://platform.openai.com/docs/guides/structured-outputs
- Models: https://platform.openai.com/docs/models
- Pricing: https://openai.com/api/pricing/

Use model names through environment variables, not hard-coded strings.

---

## 3. Model Routing

Use a model router instead of one model for every task.

```text
PLANNER_MODEL=gpt-5.5 or gpt-5.4
WRITER_MODEL=gpt-5.4-mini
EDITOR_MODEL=gpt-5.4-mini
MEMORY_MODEL=gpt-5.4-mini or lower-cost model
VALIDATOR_MODEL=gpt-5.4-mini
HIGH_STAKES_VALIDATOR_MODEL=gpt-5.5 or gpt-5.4
```

### Suggested routing

| Task | Model Tier | Notes |
|---|---|---|
| Story Bible generation | Strong | Rare but important |
| Power system design | Strong | Prevents long-term collapse |
| Saga / arc planning | Strong or medium | Run every 50–100 chapters |
| Chapter packet generation | Medium | Structured output |
| Chapter writing | Medium / mini | Highest volume task |
| Chapter polish | Medium / mini | Optional |
| Canon extraction | Cheap / mini | JSON output |
| Consistency validation | Mini for normal, strong for important chapters | Critical quality gate |

---

## 4. High-Level Pipeline

```text
User premise
  ↓
Story Bible Generator
  ↓
Saga Planner
  ↓
Arc Planner
  ↓
Chapter Packet Generator
  ↓
Context Builder
  ↓
Writer Agent
  ↓
Editor Agent / Optional Polish
  ↓
Consistency Validator
  ↓
Canon Extractor
  ↓
Database Update
  ↓
Next Chapter
```

---

## 5. Database Schema

Use PostgreSQL. JSONB fields are acceptable for flexible story data, but keep important searchable fields normalized.

### 5.1 stories

```sql
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  premise TEXT NOT NULL,
  genre TEXT DEFAULT 'xianxia_fantasy',
  tone TEXT,
  target_chapter_count INT DEFAULT 1000,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.2 story_bibles

```sql
CREATE TABLE story_bibles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  world_rules TEXT NOT NULL,
  cultivation_system TEXT NOT NULL,
  bloodline_system TEXT NOT NULL,
  style_guide TEXT NOT NULL,
  forbidden_rules TEXT NOT NULL,
  ending_direction TEXT,
  compact_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.3 characters

```sql
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  personality TEXT,
  origin TEXT,
  goals JSONB DEFAULT '[]',
  current_realm TEXT,
  current_bloodlines JSONB DEFAULT '[]',
  abilities JSONB DEFAULT '[]',
  secrets JSONB DEFAULT '[]',
  relationships JSONB DEFAULT '{}',
  inventory JSONB DEFAULT '[]',
  status TEXT DEFAULT 'alive',
  last_seen_chapter INT DEFAULT 0,
  canon_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.4 factions

```sql
CREATE TABLE factions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  ideology TEXT,
  power_level TEXT,
  known_members JSONB DEFAULT '[]',
  alliances JSONB DEFAULT '[]',
  enemies JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active',
  notes TEXT
);
```

### 5.5 bloodlines

```sql
CREATE TABLE bloodlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rank TEXT,
  source TEXT,
  traits JSONB DEFAULT '[]',
  risks JSONB DEFAULT '[]',
  compatibility JSONB DEFAULT '{}',
  evolution_path JSONB DEFAULT '[]',
  notes TEXT
);
```

### 5.6 arcs

```sql
CREATE TABLE arcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  saga_number INT,
  arc_number INT,
  title TEXT NOT NULL,
  start_chapter INT,
  end_chapter INT,
  summary TEXT,
  main_conflict TEXT,
  expected_character_changes JSONB DEFAULT '[]',
  expected_power_changes JSONB DEFAULT '[]',
  status TEXT DEFAULT 'planned'
);
```

### 5.7 chapters

```sql
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  arc_id UUID REFERENCES arcs(id),
  chapter_number INT NOT NULL,
  title TEXT,
  content TEXT,
  summary TEXT,
  status TEXT DEFAULT 'draft',
  word_count INT DEFAULT 0,
  validation_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(story_id, chapter_number)
);
```

### 5.8 chapter_packets

```sql
CREATE TABLE chapter_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  arc_id UUID REFERENCES arcs(id),
  chapter_number INT NOT NULL,
  goal TEXT NOT NULL,
  required_events JSONB DEFAULT '[]',
  characters_in_scene JSONB DEFAULT '[]',
  conflict TEXT,
  cliffhanger TEXT,
  forbidden_moves JSONB DEFAULT '[]',
  context_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.9 timeline_events

```sql
CREATE TABLE timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  event_type TEXT,
  event_text TEXT NOT NULL,
  importance TEXT DEFAULT 'medium',
  related_character_ids JSONB DEFAULT '[]',
  related_thread_ids JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.10 open_threads

```sql
CREATE TABLE open_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  opened_chapter INT,
  planned_resolution_chapter INT,
  status TEXT DEFAULT 'open',
  hints JSONB DEFAULT '[]',
  related_characters JSONB DEFAULT '[]',
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.11 canon_facts

```sql
CREATE TABLE canon_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  fact TEXT NOT NULL,
  source_chapter INT,
  importance TEXT DEFAULT 'medium',
  locked BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.12 validations

```sql
CREATE TABLE validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  pass BOOLEAN NOT NULL,
  severity TEXT DEFAULT 'medium',
  issues JSONB DEFAULT '[]',
  required_fixes JSONB DEFAULT '[]',
  validator_model TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. Context Builder

The context builder is the most important component.

Never send the full novel to the model. Build a compact context packet.

### 6.1 Context object

```ts
export type ChapterContext = {
  storyBibleCompact: string;
  styleGuide: string;
  powerRules: string;
  arcSummary: string;
  chapterPacket: ChapterPacket;
  relevantCharacters: CharacterState[];
  recentTimeline: TimelineEvent[];
  relevantCanonFacts: CanonFact[];
  openThreads: OpenThread[];
};
```

### 6.2 Retrieval strategy

For each chapter:

```text
1. Always include compact story bible.
2. Always include power rules.
3. Always include current arc summary.
4. Include characters in chapter packet.
5. Include timeline events from last 5–10 chapters.
6. Include high-importance canon facts.
7. Include open threads related to current arc or characters.
8. Include relevant bloodlines/items/factions only when needed.
```

### 6.3 Context budget

Target:

```text
Normal chapter input: 2k–5k tokens
Important chapter input: 5k–10k tokens
Never paste huge history unless doing a special audit.
```

---

## 7. Agent Definitions

### 7.1 Story Bible Generator

Input:
- Premise
- Genre
- Tone
- Target chapter count

Output:
- World rules
- Cultivation system
- Bloodline system
- Style guide
- Forbidden rules
- Ending direction
- Compact summary

### 7.2 Saga Planner

Input:
- Story bible
- Target chapter count

Output:
- 5–8 sagas
- Chapter ranges
- Main conflicts
- Major power progression
- Major mysteries

### 7.3 Arc Planner

Input:
- Saga plan
- Current state

Output:
- Arc list
- Chapter ranges
- Main conflict
- Required character changes
- Expected power changes

### 7.4 Chapter Packet Generator

Input:
- Current arc
- Recent timeline
- Current character states
- Open threads

Output:
- Chapter goal
- Required events
- Characters in scene
- Conflict
- Cliffhanger
- Forbidden moves

### 7.5 Writer Agent

Input:
- Chapter context

Output:
- Chapter title
- Chapter content

### 7.6 Editor Agent

Input:
- Chapter content
- Style guide

Output:
- Polished chapter
- Optional change notes

### 7.7 Validator Agent

Input:
- Chapter content
- Chapter context

Output:
- Pass/fail
- Issues
- Required fixes

### 7.8 Canon Extractor

Input:
- Final chapter content

Output:
- Summary
- Timeline events
- Character updates
- New canon facts
- Open thread updates
- Power changes

---

## 8. Structured Output Schemas

Use structured outputs where possible.

### 8.1 Chapter Packet schema

```json
{
  "type": "object",
  "required": ["chapter_number", "goal", "required_events", "characters_in_scene", "conflict", "cliffhanger", "forbidden_moves"],
  "properties": {
    "chapter_number": { "type": "integer" },
    "goal": { "type": "string" },
    "required_events": {
      "type": "array",
      "items": { "type": "string" }
    },
    "characters_in_scene": {
      "type": "array",
      "items": { "type": "string" }
    },
    "conflict": { "type": "string" },
    "cliffhanger": { "type": "string" },
    "forbidden_moves": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

### 8.2 Validator schema

```json
{
  "type": "object",
  "required": ["pass", "severity", "issues", "required_fixes"],
  "properties": {
    "pass": { "type": "boolean" },
    "severity": {
      "type": "string",
      "enum": ["low", "medium", "high", "critical"]
    },
    "issues": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "description"],
        "properties": {
          "type": {
            "type": "string",
            "enum": ["canon", "power_scale", "character", "timeline", "style", "plot", "other"]
          },
          "description": { "type": "string" }
        }
      }
    },
    "required_fixes": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

### 8.3 Canon Extractor schema

```json
{
  "type": "object",
  "required": ["chapter_number", "summary", "new_events", "character_updates", "new_canon_facts", "open_thread_updates", "consistency_risks"],
  "properties": {
    "chapter_number": { "type": "integer" },
    "summary": { "type": "string" },
    "new_events": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["event_type", "event_text", "importance"],
        "properties": {
          "event_type": { "type": "string" },
          "event_text": { "type": "string" },
          "importance": {
            "type": "string",
            "enum": ["low", "medium", "high"]
          }
        }
      }
    },
    "character_updates": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["character_name", "field", "old_value", "new_value", "reason"],
        "properties": {
          "character_name": { "type": "string" },
          "field": { "type": "string" },
          "old_value": { "type": "string" },
          "new_value": { "type": "string" },
          "reason": { "type": "string" }
        }
      }
    },
    "new_canon_facts": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["fact", "importance", "locked", "tags"],
        "properties": {
          "fact": { "type": "string" },
          "importance": {
            "type": "string",
            "enum": ["low", "medium", "high", "locked"]
          },
          "locked": { "type": "boolean" },
          "tags": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    },
    "open_thread_updates": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["title", "action", "note"],
        "properties": {
          "title": { "type": "string" },
          "action": {
            "type": "string",
            "enum": ["create", "add_hint", "resolve", "no_change"]
          },
          "note": { "type": "string" }
        }
      }
    },
    "consistency_risks": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

---

## 9. Prompt Templates

### 9.1 Writer Agent Prompt

```text
You are the author of a long-running xianxia / dark fantasy web novel.

Task:
Write chapter {chapter_number} using the canon context below.

Hard rules:
- Do not violate canon.
- Do not advance cultivation realm unless the chapter packet explicitly allows it.
- Do not reveal secrets unless the chapter packet explicitly allows it.
- Every chapter must contain a clear conflict.
- The protagonist can become stronger, but power must have cost, risk, limitation, or consequence.
- Keep prose immersive and cinematic.
- Avoid obvious exposition dumps.
- Avoid generic cliché lines unless intentionally subverted.
- End with a hook or cliffhanger.

Style:
- Dark xianxia / fantasy tone.
- Tension-forward pacing.
- Concrete sensory details.
- Show, do not over-explain.

Context JSON:
{context_json}

Output format:
Title: ...

Chapter:
...
```

### 9.2 Validator Prompt

```text
You are a continuity editor for a 1000-chapter fantasy novel.

Check the chapter against the provided canon context.

Validate:
1. Canon consistency
2. Power scale consistency
3. Character behavior consistency
4. Timeline consistency
5. Style consistency
6. Whether any forbidden move occurred

Return structured JSON only.

Canon context:
{context_json}

Chapter:
{chapter_content}
```

### 9.3 Canon Extractor Prompt

```text
You are the memory extraction agent for a long-running novel.

Extract only durable canon changes from this chapter.
Do not include temporary mood, generic descriptions, or repeated facts unless they changed.
Focus on facts that may affect future chapters.

Extract:
- Chapter summary
- Timeline events
- Character updates
- New canon facts
- Open thread updates
- Consistency risks

Return structured JSON only.

Chapter number: {chapter_number}
Chapter content:
{chapter_content}
```

### 9.4 Chapter Packet Generator Prompt

```text
You are the story planner for a long-running xianxia / fantasy novel.

Generate the next chapter packet based on the current arc plan and canon state.
The chapter packet should be specific enough for a writer model to write the chapter without inventing major plot direction.

Rules:
- Do not resolve major open threads too early.
- Do not add new powers unless the arc plan permits it.
- Keep one primary conflict per chapter.
- Include a clear cliffhanger or hook.

Return structured JSON only.

Story state:
{context_json}
```

---

## 10. TypeScript Service Interfaces

### 10.1 Model router

```ts
export type AgentRole =
  | 'planner'
  | 'writer'
  | 'editor'
  | 'memory'
  | 'validator'
  | 'high_stakes_validator';

export function getModelForRole(role: AgentRole): string {
  const map: Record<AgentRole, string | undefined> = {
    planner: process.env.PLANNER_MODEL,
    writer: process.env.WRITER_MODEL,
    editor: process.env.EDITOR_MODEL,
    memory: process.env.MEMORY_MODEL,
    validator: process.env.VALIDATOR_MODEL,
    high_stakes_validator: process.env.HIGH_STAKES_VALIDATOR_MODEL,
  };

  const model = map[role];
  if (!model) throw new Error(`Missing model config for role: ${role}`);
  return model;
}
```

### 10.2 Context builder interface

```ts
export async function buildChapterContext(params: {
  storyId: string;
  chapterNumber: number;
  arcId: string;
  chapterPacketId?: string;
}): Promise<ChapterContext> {
  // 1. Load compact story bible
  // 2. Load active arc
  // 3. Load chapter packet
  // 4. Load characters listed in packet
  // 5. Load recent timeline events
  // 6. Load important canon facts
  // 7. Load relevant open threads
  // 8. Return compact context
  throw new Error('Not implemented');
}
```

### 10.3 Chapter generation orchestrator

```ts
export async function generateChapter(params: {
  storyId: string;
  chapterNumber: number;
  mode: 'safe' | 'semi_auto' | 'full_auto';
}) {
  // 1. Ensure chapter row exists
  // 2. Generate or load chapter packet
  // 3. Build chapter context
  // 4. Call Writer Agent
  // 5. Optional Editor Agent
  // 6. Call Validator Agent
  // 7. If validation fails, either auto-fix or mark as needs_review
  // 8. Call Canon Extractor
  // 9. Persist memory updates
  // 10. Mark chapter complete or needs_review
}
```

---

## 11. Queue Jobs

Use BullMQ jobs:

```text
generate_story_bible
plan_sagas
plan_arc
generate_chapter_packet
write_chapter
edit_chapter
validate_chapter
extract_canon
persist_canon_update
generate_chapter_batch
review_arc
```

Recommended job behavior:

```text
- Retry transient API failures 3 times.
- Do not retry validation failures as API failures.
- Save every intermediate LLM output.
- Store model name, prompt version, token usage, and cost estimate.
```

---

## 12. Validation and Auto-Fix

If validator returns `pass=false`:

### Low / medium severity
Auto-fix once.

```text
Send chapter + validator issues to Editor Agent.
Ask it to revise only the problematic parts.
Run validator again.
```

### High / critical severity
Stop and mark chapter as `needs_review`.

Examples:
- Main character learns a secret too early
- Realm jump without permission
- Dead character appears alive
- Major open thread resolved hundreds of chapters too early

---

## 13. Power Budget Rules

This is essential for a protagonist with infinite bloodline upgrade potential.

Store in `story_bibles.cultivation_system` or separate `power_rules`.

```text
1. Major power upgrade max once per arc unless explicitly planned.
2. Minor progress allowed every few chapters.
3. New bloodline requires real sample/source.
4. High-rank bloodline requires special ritual, resource, or sacrifice.
5. Fusion above current realm creates backlash.
6. Every bloodline leaves personality/instinct residue.
7. Protagonist cannot defeat opponents two major realms above without special setup.
8. Infinite potential does not mean infinite current power.
9. Power must create new problems, not only solve old ones.
10. Any major breakthrough must be recorded in character state and timeline.
```

---

## 14. Memory Update Rules

Only store durable facts.

Store:

```text
- Character realm changes
- Bloodline percentage / evolution changes
- New abilities
- New relationships
- Secrets learned or revealed
- Items gained/lost
- Deaths
- Major promises
- Open mysteries
- Faction status changes
- Important locations discovered
```

Do not store:

```text
- Generic emotions unless relationship-changing
- Temporary injuries unless persistent
- Repeated known facts
- Descriptive scenery
- Dialogue unless it creates a promise, clue, or canon fact
```

---

## 15. Example Story Bible Seed

Use this as initial seed for the novel idea discussed.

```text
Title: TBD
Genre: Dark xianxia / bloodline fantasy
Premise:
In a world where cultivation depends on inherited bloodline, a rejected youth named Lam Trach awakens a forbidden ability: his empty bloodline can absorb, upgrade, and evolve any bloodline without a fixed ceiling. But every upgrade leaves residue inside his body and mind, slowly changing what it means for him to remain human.

Core theme:
Power without origin, identity under mutation, survival in a world that worships bloodline purity.

Protagonist:
Lam Trach. Born with empty mortal blood. Rejected by a sect. Practical, patient, distrustful, not saintly. His goal begins as survival, then revenge, then discovering the origin of empty blood.

Core ability:
Infinite Bloodline Evolution.

Limitations:
- Requires real bloodline sample.
- Requires energy/resources to integrate.
- Higher bloodlines cause backlash.
- Each bloodline leaves instinct residue.
- Incompatible bloodlines may conflict.
- The system reveals only partial information.

Opening state:
Lam Trach fuses a weak Hac Nha Beast bloodline fragment and senses spiritual energy for the first time.
```

---

## 16. API Cost Tracking

Store usage per call.

```sql
CREATE TABLE llm_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id),
  agent_role TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT,
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  cached_input_tokens INT DEFAULT 0,
  estimated_cost_usd NUMERIC(10, 6),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Cost formula:

```ts
estimatedCost =
  (inputTokens / 1_000_000) * inputPrice +
  (cachedInputTokens / 1_000_000) * cachedInputPrice +
  (outputTokens / 1_000_000) * outputPrice;
```

Keep prices configurable because API pricing changes.

---

## 17. UI Pages

MVP pages:

```text
/stories
/stories/:id/bible
/stories/:id/characters
/stories/:id/arcs
/stories/:id/chapters
/stories/:id/chapters/:chapterNumber
/stories/:id/timeline
/stories/:id/open-threads
/stories/:id/generate
/stories/:id/costs
```

### Important UI features

```text
- Canon diff view after each chapter
- Approve / reject canon updates
- Validation issue panel
- Character state editor
- Power progression graph
- Open threads dashboard
- Batch generation controls
```

---

## 18. Implementation Phases

### Phase 1 — MVP

```text
1. Create story
2. Generate story bible
3. Add/edit characters
4. Generate chapter packet
5. Write one chapter
6. Extract canon update
7. Update timeline and character state
```

### Phase 2 — Quality System

```text
1. Add validator
2. Add auto-fix loop
3. Add open threads
4. Add power rules
5. Add cost tracking
```

### Phase 3 — Semi Auto Production

```text
1. Generate 5-chapter batch
2. Validate batch
3. Extract memory per chapter
4. Human approve/reject batch
5. Add arc review every 20–50 chapters
```

### Phase 4 — Full Auto Arc Generation

```text
1. Generate full arc
2. Stop on critical validator failure
3. Auto summarize arc
4. Update saga plan
5. Run high-stakes model review
```

---

## 19. Non-Negotiable Quality Gates

Before a chapter can be marked complete:

```text
- Chapter content exists
- Summary exists
- Validator pass is true or human override exists
- Canon extractor output exists
- Timeline update persisted
- Character changes persisted or explicitly rejected
- Open thread updates persisted or explicitly rejected
```

---

## 20. Anti-Patterns to Avoid

```text
- Feeding all previous chapters into every prompt
- Letting the writer invent major plot direction
- Updating memory from raw chapter without structured extraction
- Allowing realm upgrades without power budget validation
- Generating 100 chapters without arc-level review
- Treating summaries as canon without confirmation
- Hard-coding model names
- Not storing LLM call history and costs
```

---

## 21. First Codex Task List

Ask Codex to implement in this order:

```text
1. Initialize Next.js + backend project.
2. Add PostgreSQL schema and migrations.
3. Add Prisma/Drizzle models.
4. Add OpenAI client wrapper.
5. Add model router via env vars.
6. Implement story creation.
7. Implement story bible generation endpoint.
8. Implement chapter packet generation endpoint.
9. Implement context builder.
10. Implement writer agent endpoint.
11. Implement validator endpoint.
12. Implement canon extractor endpoint.
13. Implement memory persistence service.
14. Add UI pages for story bible, characters, chapters, timeline.
15. Add cost tracking.
16. Add BullMQ batch generation.
```

---

## 22. Example `.env`

```bash
OPENAI_API_KEY=...
DATABASE_URL=postgresql://user:password@localhost:5432/novel_factory
REDIS_URL=redis://localhost:6379

PLANNER_MODEL=gpt-5.5
WRITER_MODEL=gpt-5.4-mini
EDITOR_MODEL=gpt-5.4-mini
MEMORY_MODEL=gpt-5.4-mini
VALIDATOR_MODEL=gpt-5.4-mini
HIGH_STAKES_VALIDATOR_MODEL=gpt-5.5

DEFAULT_GENERATION_MODE=semi_auto
NORMAL_CONTEXT_TOKEN_BUDGET=5000
IMPORTANT_CONTEXT_TOKEN_BUDGET=10000
```

---

## 23. Final Design Principle

The application should behave like an editorial team:

```text
Planner decides direction.
Writer writes scenes.
Editor improves style.
Validator protects continuity.
Memory extractor updates canon.
Database remembers everything.
Human approves important changes.
```

That is the difference between a toy AI writing demo and a durable long-form fiction engine.
