# Novel Writer

AI Novel Factory v2 — see `docs/superpowers/specs/2026-04-28-ai-novel-factory-v2-design.md`.

## First-time setup

```bash
# 1. tools
brew install node@22 pnpm postgresql@16 docker

# 2. install
pnpm install

# 3. start postgres (with pgvector)
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml exec postgres psql -U novel -d novel_factory -c 'CREATE EXTENSION IF NOT EXISTS vector;'

# 4. apply migrations
DATABASE_URL=postgresql://novel:novel@localhost:5432/novel_factory pnpm db:migrate

# 5. copy env
cp .env.local.example .env.local
# fill in OPENROUTER_API_KEY when you want to make real calls
```

## Daily dev

```bash
pnpm dev          # starts api + web in parallel
# api  -> http://localhost:4000
# web  -> http://localhost:3000
```

## LLM call policy

This codebase NEVER makes live LLM API calls during automated tests. Tests use the mock provider.

To run a one-off live smoke against OpenRouter (costs real money):
```bash
pnpm --filter @novel/api tsx scripts/smoke-bible.ts <storyId>
```

To enqueue a chapter generation job (requires Redis + worker):
```bash
pnpm smoke:generate-chapter <storyId> <chapterNumber>
```

## Tests

```bash
pnpm test
TEST_DATABASE_URL=postgresql://novel:novel@localhost:5432/novel_factory pnpm --filter @novel/api test
```