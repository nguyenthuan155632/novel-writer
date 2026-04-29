# Novel Factory

Single-user local app that generates 500–1000 chapter Vietnamese xianxia / fantasy novels with consistency preserved across the run.

## What it does

- Takes a one-line premise → produces a full bible, sagas, arcs, and chapters
- Default model route: `google/gemini-2.5-flash` (seeded in Postgres; overridden per provider in Admin)
- Target cost: ≤ $0.05 / chapter; actual cost depends on the configured provider/model
- Uses a 3-tier context cache (HOT / WARM / COLD), a canon DB, and 12 specialized agents

## Stack

- pnpm workspaces: `apps/{api,web,worker}` + `packages/{ai,core,db}`
- Fastify (API) · Next.js 15 App Router (web) · BullMQ + Redis (worker)
- PostgreSQL 16 + pgvector · Drizzle ORM
- LLM gateway: OpenCode Go (default), OpenRouter, local Ollama (OpenAI-compatible), Google Direct (for explicit caching)

## Getting started

```bash
# 1. Bring up Postgres + Redis
docker compose up -d

# 2. Install + migrate
pnpm install
pnpm --filter @novel/db migrate

# 3. Seed prompt versions
pnpm --filter @novel/db seed:prompts

# 4. Run all services
pnpm dev   # api + web + worker concurrently
```

Env vars (copy `.env.example` → `.env`):

- `OPENCODE_API_KEY` — required when OpenCode is the active provider
- `OPENROUTER_API_KEY` — required when OpenRouter is the active provider, and for embedding calls in chapter generation
- `OLLAMA_BASE_URL` — optional (defaults to `http://localhost:11434/v1`) when using Ollama; `OLLAMA_API_KEY` only if your server expects a Bearer token
- `GOOGLE_API_KEY` — optional, enables Pro / Flash with explicit caching
- `DATABASE_URL`, `REDIS_URL` — connection strings
- `RUN_LIVE_LLM=1` — gate live-API tests

Base URL overrides (`OPENCODE_BASE_URL`, `OPENROUTER_BASE_URL`) are optional; see `.env.example`.

### Provider + model settings

Active LLM provider and per-role model routes are stored in **PostgreSQL** (`llm_provider_state`, `llm_provider_settings`). The header switches the globally active provider; `/admin` edits model routes for each provider. **These settings survive API restarts.** Mock mode (`NOVEL_FORCE_MOCK_LLM=1`) still bypasses live providers.

`NOVEL_LLM_PROVIDER` and per-role model env vars (`WRITER_MODEL`, `BIBLE_MODEL`, etc.) are **not** used at runtime for provider or route selection anymore; configure them in the UI after migrate/seed.

## Key docs

- `docs/architecture.md` — full system architecture
- `docs/runbook.md` — ops, recovery, common breakages
- `docs/superpowers/specs/2026-04-28-ai-novel-factory-v2-design.md` — authoritative design spec
- `docs/superpowers/plans/` — phased implementation plans (1: foundation, 2: chapter pipeline, 3: long-form scale, 4: polish & UX)

## Cost guardrails

Per-chapter $0.05 hard cap, per-story $5 / day, $50 / month, alert at 80%. Override per story via `/stories/:id/settings`.

## License

Personal use. No multi-user / SaaS support — see spec section 7.7 for non-goals.
