# Gemini Context: Novel Factory

This project is a single-user local application designed to generate long-form (500–1000 chapters) Vietnamese xianxia/fantasy novels with high consistency and low cost (≤ $0.05/chapter).

## Project Overview

- **Core Goal**: Preserving narrative consistency across massive runs using a hierarchical "system remembers, model writes" approach.
- **Key Mechanics**:
    - **3-Tier Context Cache**: HOT (Bible/Style), WARM (Rolling Summaries), COLD (Recent Timeline/Seeds).
    - **Canon Database**: Truth source for characters, facts, and events.
    - **12 Specialized Agents**: Writer, Planner, Auditor, Validator, Extractor, etc.
    - **Budget Guardrails**: Hard caps on per-chapter and per-story costs.

## Architecture & Monorepo Structure

- **`apps/api`**: Fastify HTTP server providing REST endpoints for story management, admin settings, and triggering generation.
- **`apps/web`**: Next.js 15 (App Router) dashboard for reading, reviewing canon, and managing story bibles.
- **`apps/worker`**: BullMQ + Redis background processor handling the heavy lifting of chapter generation pipelines.
- **`packages/ai`**: The "brain". Contains agent logic, prompt templates (in `src/prompts/`), and the context builder.
- **`packages/core`**: Domain logic, configuration (budget guards, policy), and shared utilities.
- **`packages/db`**: Drizzle ORM schema, migrations, and PostgreSQL client.

## Tech Stack

- **Runtime**: Node.js 22+ (pnpm workspaces).
- **Backend**: Fastify 5.
- **Frontend**: Next.js 15, React 19, Vanilla CSS.
- **Database**: PostgreSQL 16 + pgvector (via Drizzle ORM).
- **Queue**: BullMQ + Redis.
- **AI**: Gemini 2.5 Flash (default), supports a reusable OpenAI-compatible endpoint, OpenRouter, and local Ollama.

## Critical Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Starts API, Web, and Worker concurrently. |
| `pnpm build` | Builds all packages and apps. |
| `pnpm test` | Runs vitest across the monorepo. |
| `pnpm db:migrate` | Applies Drizzle migrations to PostgreSQL. |
| `pnpm db:studio` | Opens Drizzle Studio for DB exploration. |
| `pnpm smoke:bible` | Smoke test for story bible generation. |
| `pnpm smoke:generate-chapter` | Smoke test for full chapter generation pipeline. |

## Development Conventions

- **LLM Settings**: Model routes and active providers are stored in the database (`llm_provider_settings`). **Do not hardcode model names** in code; use the provider abstraction.
- **Observability**: Every LLM call is logged to the `llm_calls` table. Every context construction is recorded in `context_packets`.
- **Canon Integrity**: Direct writes to the canon should be avoided. Use the `reconciliation/canon-merger.ts` or flow through `pending_canon_updates`.
- **Styling**: Prefer Vanilla CSS for the web frontend.
- **Prompting**: Prompts are defined as `DualPromptTemplate` or `PromptTemplate` in `packages/ai/src/prompts/` and registered in the registry.

## Common Workflows

1. **New Feature**: Add schema to `packages/db`, run `pnpm db:generate`, implement logic in `packages/core` or `packages/ai`, and expose via `apps/api`.
2. **Prompt Update**: Modify the template in `packages/ai/src/prompts/`, bump the version if necessary, and ensure the DB matches if using versioned prompt selection.
3. **Debugging Workers**: Check Redis job counts or use `apps/worker` dev logs. Common job state can be cleared via `redis-cli`.

See `docs/architecture.md`, `docs/runbook.md`, and `docs/specs/ai_novel_factory_codex_spec.md` for more technical and operational details.

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
