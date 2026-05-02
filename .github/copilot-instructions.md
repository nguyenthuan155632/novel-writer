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

All LLM calls go through the `LLMProvider` interface (`complete(req): Promise<CompletionResponse>`). Available providers: `google-direct`, `openrouter`, `opencode`, `ollama`, `vmlx`, `mock`.

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
