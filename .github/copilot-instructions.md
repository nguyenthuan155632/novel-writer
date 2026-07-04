# Novel Factory — Copilot Instructions

Single-user local application for generating long-form (500–1000 chapters) Vietnamese xianxia/fantasy novels. Target cost ≤ $0.05/chapter using a "system remembers, model writes" architecture.

## Commands

```bash
pnpm dev                        # Start API + Web + Worker concurrently
pnpm build                      # Build all packages and apps
pnpm test                       # Run vitest across the monorepo
pnpm typecheck                  # Type-check all packages
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

> `apps/api` tests are run with `fileParallelism: false` because they share a Postgres instance and mutate global `llm_*` rows.

## Architecture

### Monorepo Packages

| Package | Role |
|---------|------|
| `packages/db` | Drizzle ORM schema, PostgreSQL client, migrations |
| `packages/core` | Domain config, budget guardrails, model routing, shared utilities |
| `packages/ai` | All LLM agent logic, prompt templates, context builder, providers |
| `apps/api` | Fastify 5 REST server — story management, triggering generation |
| `apps/worker` | BullMQ + Redis background processor — runs the chapter pipeline |
| `apps/web` | Next.js 15 (App Router) dashboard — reading, canon review, settings |

### Chapter Generation Pipeline

The worker's `generate-chapter` job orchestrates the entire pipeline in sequence:

1. **Plan**: `PacketGenerator` → `PacketAuditor` (deterministic canon check) → `DeterministicValidator`
2. **Write**: `WriterAgent`
3. **Validate**: `LlmValidatorAgent` → `AutoFixerAgent` (on low/medium severity issues)
4. **Memory**: `CanonExtractor` → `CanonMerger` → `SummaryCompactor`
5. **Async follow-ups**: `RefreshArcSummary`, `HighStakesReview` (queued separately)

### 3-Tier Context Cache (`packages/ai/src/context/`)

Every chapter is generated from a `ChapterContext` assembled by `buildContext()`:

- **HOT tier** — Bible, style guide, power system, genre/personality contracts. Stable; hashed for cache detection.
- **WARM tier** — Saga/arc summaries, active characters, open threads, planted seeds.
- **COLD tier** — Recent chapter summaries, vector-retrieved canon facts, seeds due now, the `ChapterPacket`.

### LLM Provider Abstraction (`packages/ai/src/providers/`)

All LLM calls go through the `LLMProvider` interface (`complete(req): Promise<CompletionResponse>`). Available providers: `google-direct`, `openai-compatible`, `openrouter`, `ollama`, `vmlx`, `mock`.

The active provider and per-agent model routes are stored in the database (`llm_provider_settings`, `llm_provider_state`). Toggled at runtime via `PUT /api/admin/provider` and `PUT /api/admin/models`.

Every call is wrapped in `LoggedLLMProvider`, which writes to `llm_calls` and accumulates cost in `story_costs`.

## Key Conventions

### Never hardcode model names
Models are resolved through `modelFor(role: AgentRole)` from `@novel/core`, which reads from `MODEL_CONFIG.routes`. The active DB provider overrides these at runtime. Using a literal model string anywhere outside the config/models file is a bug.

### New feature workflow
1. Add/modify schema in `packages/db/src/schema/`
2. Run `pnpm db:generate` to create the migration
3. Implement logic in `packages/core` or `packages/ai`
4. Expose via a route in `apps/api/src/routes/`

### Prompt templates
Prompts live in `packages/ai/src/prompts/` as versioned files (e.g., `writer.v2.ts`). Each exports a `PromptTemplate` or `DualPromptTemplate` (with separate `system` + `user` fields) and is registered via `registerPrompt()` in the registry. When updating a prompt, bump the version and ensure any DB-side versioned prompt selection is updated.

### Canon integrity
Never write directly to canon tables. New facts from generated chapters are staged as `pending_canon_updates` and processed through `packages/ai/src/reconciliation/canon-merger.ts`, which handles auto-merge for low-conflict facts and queues others for human review.

### Generation modes
Three modes control batch sizes and escalation behavior (from `GENERATION_CONFIG`):
- `safe` — 1 chapter at a time, human approval required
- `semi_auto` — 5-chapter batches
- `full_auto` — 30-chapter batches

Auto-escalation to `safe` mode is triggered on: first/last chapter of an arc, `high`/`critical` validator findings, or blocking canon conflicts.

### Budget guardrails
Hard caps enforced via `checkAgainstCaps()` from `packages/core/src/policy/budget-guardrails.ts`:
- Per-chapter: $0.05
- Daily: $5.00
- Monthly: $50.00

### Per-story config overrides
Each story can override the global `EffectiveConfig` (model routes, budget, context window sizes, generation params) via `story_settings`. Load with `getEffectiveConfig(storyId, provider)` — always use this instead of reading global config constants directly in worker jobs.

### Observability
- Every LLM call → `llm_calls` table
- Every context build → `context_packets` table
- Enable prompt logging in the worker via the `LOG_LLM_PROMPTS` env var (very verbose)

### Web frontend
Use vanilla CSS (in `globals.css` or component-level `.css` files). Do not introduce CSS-in-JS or utility-class frameworks.

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
