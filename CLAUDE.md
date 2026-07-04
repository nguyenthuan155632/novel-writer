# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev                        # Start API + Web + Worker concurrently
pnpm build                      # Build all packages and apps
pnpm test                       # Run vitest across the monorepo
pnpm typecheck                  # Type-check all packages
pnpm lint                       # Lint all packages
pnpm db:generate                # Generate Drizzle migrations after schema changes
pnpm db:migrate                 # Apply migrations to PostgreSQL
pnpm db:studio                  # Open Drizzle Studio
pnpm smoke:bible                # Smoke test for story bible generation
pnpm smoke:generate-chapter     # Smoke test for full chapter generation pipeline
```

**Run a single test file:**
```bash
pnpm --filter @novel/api vitest run test/stories.test.ts
pnpm --filter @novel/ai  vitest run test/agents/writer.test.ts
```

> `apps/api` tests run with `fileParallelism: false` — they share a Postgres instance and mutate global `llm_*` rows.

**Infrastructure:**
```bash
docker compose -f docker-compose.dev.yml up -d   # Start Postgres + Redis
```

## Architecture

### Monorepo Layout

| Package | Role |
|---------|------|
| `packages/db` | Drizzle ORM schema, PostgreSQL client, migrations |
| `packages/core` | Domain config, budget guardrails, model routing, shared utilities |
| `packages/ai` | All LLM agent logic, prompt templates, context builder, providers |
| `apps/api` | Fastify 5 REST server — story management, triggering generation |
| `apps/worker` | BullMQ + Redis background processor — runs the chapter pipeline |
| `apps/web` | Next.js 15 (App Router) dashboard — reading, canon review, settings |

### Chapter Generation Pipeline (Worker)

The `generate-chapter` BullMQ job orchestrates this sequence:

1. **Plan**: `PacketGenerator` → `PacketAuditor` (canon check) → `DeterministicValidator`. If the auditor still requires regeneration after all retries, non-safe modes pause the chapter (`paused_pending_updates`) for human review instead of writing with a bad packet.
2. **Write**: `WriterAgent`
3. **Validate**: `LlmValidatorAgent` → `AutoFixerAgent` (low/medium severity only)
4. **Memory**: `CanonExtractor` → `CanonMerger` → `SummaryCompactor`
5. **Async follow-ups**: `RefreshArcSummary`, `HighStakesReview` (queued separately). Arc/saga rolling-summary refreshes only fire on the configured every-N-chapters cadence and compact incrementally from `lastCompactedChapter`.

### 3-Tier Context Cache (`packages/ai/src/context/`)

`buildContext()` assembles a `ChapterContext` from:
- **HOT tier** — Bible, style guide, power system, genre/personality contracts (stable, hashed)
- **WARM tier** — Saga/arc summaries, active characters, open threads, planted seeds
- **COLD tier** — Recent chapter summaries, vector-retrieved canon facts, seeds due now, the `ChapterPacket`

### LLM Provider Abstraction (`packages/ai/src/providers/`)

All LLM calls go through `LLMProvider.complete(req)`. Providers: `google-direct`, `openai-compatible`, `openrouter`, `ollama`, `vmlx`, `mock`.

- Active provider and per-agent model routes are stored in the DB (`llm_provider_settings`, `llm_provider_state`)
- Toggle at runtime via `PUT /api/admin/provider` and `PUT /api/admin/models`
- Every call is wrapped by `LoggedLLMProvider` → writes to `llm_calls`, accumulates cost in `story_costs`

## Key Conventions

### Model resolution
Never hardcode model strings. Always use `modelFor(role: AgentRole)` from `@novel/core`. A literal model name anywhere outside `packages/core/src/config/models.ts` is a bug.

### New feature workflow
1. Schema changes → `packages/db/src/schema/`
2. `pnpm db:generate` to create the migration
3. Logic → `packages/core` or `packages/ai`
4. Route exposure → `apps/api/src/routes/`

### Prompt templates
Prompts live in `packages/ai/src/prompts/` as versioned files (e.g., `writer.v2.ts`). Export a `PromptTemplate` or `DualPromptTemplate` and register via `registerPrompt()`. Bumping a version requires updating DB-side versioned prompt selection.

### Canon integrity
Never write directly to canon tables. New facts must go through `pending_canon_updates`, then `packages/ai/src/reconciliation/canon-merger.ts` (auto-merges low-conflict facts; queues others for human review).

### Effective config
Always load story config with `getEffectiveConfig(storyId, provider)` from `@novel/core`. Never read global config constants directly in worker jobs — per-story overrides in `story_settings` take precedence.

### Generation modes
Defined in `GENERATION_CONFIG`:
- `safe` — 1 chapter at a time, human approval required
- `semi_auto` — 5-chapter batches
- `full_auto` — 30-chapter batches

Auto-escalation to `safe` triggers on: first/last chapter of an arc, `high`/`critical` validator findings, or blocking canon conflicts.

### Budget guardrails
Hard caps in `packages/core/src/policy/budget-guardrails.ts` via `checkAgainstCaps()`:
- Per-chapter: $0.05 · Daily: $5.00 · Monthly: $50.00

### Web frontend
Use vanilla CSS (in `globals.css` or component-level `.css` files). Do not introduce CSS-in-JS or utility-class frameworks.

### Observability
- Every LLM call → `llm_calls` table
- Every context build → `context_packets` table
- Set `LOG_LLM_PROMPTS=1` in the worker env for verbose prompt logging

## Environment Variables

Copy `.env.example` → `.env`. Key vars:
- `DATABASE_URL`, `REDIS_URL` — connection strings
- `OPENROUTER_API_KEY` — required for OpenRouter provider and embedding calls
- `OPENAI_COMPATIBLE_API_KEY`, `OPENAI_COMPATIBLE_BASE_URL` — required for the reusable OpenAI-compatible provider
- `GOOGLE_API_KEY` — optional, enables Google Direct (Pro/Flash with explicit caching)
- `OLLAMA_BASE_URL` — optional (defaults to `http://localhost:11434/v1`)
- `RUN_LIVE_LLM=1` — gate live-API tests
- `NOVEL_FORCE_MOCK_LLM=1` — bypass all live providers for testing

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **novel-writer** (4406 symbols, 7298 relationships, 202 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/novel-writer/context` | Codebase overview, check index freshness |
| `gitnexus://repo/novel-writer/clusters` | All functional areas |
| `gitnexus://repo/novel-writer/processes` | All execution flows |
| `gitnexus://repo/novel-writer/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
