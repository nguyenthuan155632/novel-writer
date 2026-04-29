# Architecture

The system is built around one core idea: **the system remembers, the model writes**. Long-form coherence comes from canon DB + hierarchical summaries + a 3-tier context cache, not from feeding the model bigger prompts.

## Layers

| Layer | Package | Purpose |
|-------|---------|---------|
| DB schema + migrations | `packages/db` | 20 Drizzle tables (stories, chapters, sagas, arcs, planted_seeds, canon_facts, pending_canon_updates, llm_calls, validations, context_packets, prompt_versions, story_settings, …) |
| Domain services + config | `packages/core` | `getEffectiveConfig`, validators, packet auditor, conflict detector, canon merger, exporters, admin metrics |
| AI agents + context builder | `packages/ai` | 12 agents, context builder (HOT/WARM/COLD), retrieval (recent summaries / top-K facts / past chapters), provider abstraction |
| HTTP API | `apps/api` | Fastify routes for entities, generation, settings, exports, admin |
| Web UI | `apps/web` | Next.js 15 App Router, all per-story pages + `/admin` |
| Worker | `apps/worker` | BullMQ jobs: `generate-chapter`, `generate-batch`, `refresh-arc-summary`, `refresh-saga-summary`, `high-stakes-review`, `generate-export` |

## Generation pipeline (per chapter)

1. **Mode escalation** — `resolveEffectiveMode` picks `safe` / `semi_auto` / `full_auto` based on user setting, chapter number, arc start/end, blocking pending updates
2. **Context build** — HOT (bible + style few-shots) + WARM (arc rolling summary + active chars) + COLD (recent timeline + due seeds)
3. **Packet generator** — produces `ChapterPacket` (required events, conflicts, cliffhanger, character beats)
4. **Packet auditor** (code) — checks vs canon (realm jumps, dead chars, forbidden moves, seed coverage)
5. **Writer** — generates 2000–3000 word Vietnamese chapter
6. **Deterministic validator** (code) — regex + DB lookup; critical fail short-circuits
7. **LLM validator** — soft checks (voice, plot logic, style) on Flash Lite
8. **Auto-fixer** — patches low/medium issues (max 1 attempt)
9. **Canon extractor** — writes to `pending_canon_updates`
10. **Canon merger** — auto-merges or queues for user review based on conflict status + mode
11. **Summary compactor** — per-chapter (200/500 tok), then arc/saga rolling summaries on cadence
12. **High-stakes reviewer** — Pro model, fires on arc end, critical severity, or manual

## Cache tiers

| Tier | Content | Size | Invalidation |
|------|---------|------|--------------|
| HOT  | bible compact, style guide, power rules, style few-shots | ~2.5K tok | `bible.version` bump |
| WARM | arc rolling summary, active chars, open threads | ~2K tok | `arc.summary_version` bump |
| COLD | last N chapter summaries, due planted seeds | ~3K tok | per chapter |

Cache hit rate visible at `/admin`.

## Cost guardrails

`packages/core/src/services/budget-guard.ts`:
- Per-chapter hard cap (`budget.PER_CHAPTER_HARD_CAP_USD`, default $0.05) — soft during generation, hard at enqueue
- Per-story daily / monthly caps (`PER_STORY_DAILY_CAP_USD` / `PER_STORY_MONTHLY_CAP_USD`) with 80% alert threshold
- Overridable per story via `story_settings.overrides.budget`

## Data invariants

- Every LLM call → row in `llm_calls` (model, tokens, cost, prompt_version)
- Every context build → row in `context_packets`
- Canon writes flow only through `reconciliation/canon-merger.ts`
- No hard-coded model names — only via `MODEL_CONFIG.routes`
- Cache prefix order is stable across calls in the same story

See `docs/superpowers/specs/2026-04-28-ai-novel-factory-v2-design.md` for the full design.