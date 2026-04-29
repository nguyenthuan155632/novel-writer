# Novel Factory

Single-user local app that generates 500–1000 chapter Vietnamese xianxia / fantasy novels with consistency preserved across the run.

## What it does

- Takes a one-line premise → produces a full bible, sagas, arcs, and chapters
- Default model: `glm-5.1` via OpenCode Go (configurable per story)
- Target cost: ≤ $0.05 / chapter; actual cost depends on the configured provider/model
- Uses a 3-tier context cache (HOT / WARM / COLD), a canon DB, and 12 specialized agents

## Stack

- pnpm workspaces: `apps/{api,web,worker}` + `packages/{ai,core,db}`
- Fastify (API) · Next.js 15 App Router (web) · BullMQ + Redis (worker)
- PostgreSQL 16 + pgvector · Drizzle ORM
- LLM gateway: OpenCode Go (default), OpenRouter (available provider), Google Direct (for explicit caching)

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

- `OPENCODE_API_KEY` — required for LLM calls
- `OPENROUTER_API_KEY` — required for embedding calls in chapter generation
- `GOOGLE_API_KEY` — optional, enables Pro / Flash with explicit caching
- `DATABASE_URL`, `REDIS_URL` — connection strings
- `RUN_LIVE_LLM=1` — gate live-API tests

## Key docs

- `docs/architecture.md` — full system architecture
- `docs/runbook.md` — ops, recovery, common breakages
- `docs/superpowers/specs/2026-04-28-ai-novel-factory-v2-design.md` — authoritative design spec
- `docs/superpowers/plans/` — phased implementation plans (1: foundation, 2: chapter pipeline, 3: long-form scale, 4: polish & UX)

## Cost guardrails

Per-chapter $0.05 hard cap, per-story $5 / day, $50 / month, alert at 80%. Override per story via `/stories/:id/settings`.

## License

Personal use. No multi-user / SaaS support — see spec section 7.7 for non-goals.
