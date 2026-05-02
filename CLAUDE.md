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

1. **Plan**: `PacketGenerator` → `PacketAuditor` (canon check) → `DeterministicValidator`
2. **Write**: `WriterAgent`
3. **Validate**: `LlmValidatorAgent` → `AutoFixerAgent` (low/medium severity only)
4. **Memory**: `CanonExtractor` → `CanonMerger` → `SummaryCompactor`
5. **Async follow-ups**: `RefreshArcSummary`, `HighStakesReview` (queued separately)

### 3-Tier Context Cache (`packages/ai/src/context/`)

`buildContext()` assembles a `ChapterContext` from:
- **HOT tier** — Bible, style guide, power system, genre/personality contracts (stable, hashed)
- **WARM tier** — Saga/arc summaries, active characters, open threads, planted seeds
- **COLD tier** — Recent chapter summaries, vector-retrieved canon facts, seeds due now, the `ChapterPacket`

### LLM Provider Abstraction (`packages/ai/src/providers/`)

All LLM calls go through `LLMProvider.complete(req)`. Providers: `google-direct`, `openrouter`, `opencode`, `ollama`, `vmlx`, `mock`.

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

## Local Working Protocol: Obsidian Graph First

You have access to Obsidian through the `mcp-obsidian` MCP server.

Before doing any non-trivial coding task, architecture task, debugging task, refactor, database change, worker change, AI provider change, validation change, or prompt change:

1. Search Obsidian first.
2. Use search terms based on the current task.
3. Read the most relevant Obsidian notes before planning.
4. In your plan, mention:
   - Obsidian notes consulted
   - relevant architecture/domain constraints found
   - whether documentation is missing or outdated
5. Only then inspect or modify source code.

After completing work:
1. If architecture, flow, schema, domain behavior, config, validation, or error handling changed, update the relevant Obsidian notes.
2. If no relevant note exists, create one.
3. In the final response, include:
   - Obsidian notes read
   - Obsidian notes updated
   - source files changed

Do not copy secrets into Obsidian.
Document env var names only, never values.

## Environment Variables

Copy `.env.example` → `.env`. Key vars:
- `DATABASE_URL`, `REDIS_URL` — connection strings
- `OPENROUTER_API_KEY` — required for OpenRouter provider and embedding calls
- `OPENCODE_API_KEY` — required for OpenCode provider
- `GOOGLE_API_KEY` — optional, enables Google Direct (Pro/Flash with explicit caching)
- `OLLAMA_BASE_URL` — optional (defaults to `http://localhost:11434/v1`)
- `RUN_LIVE_LLM=1` — gate live-API tests
- `NOVEL_FORCE_MOCK_LLM=1` — bypass all live providers for testing
