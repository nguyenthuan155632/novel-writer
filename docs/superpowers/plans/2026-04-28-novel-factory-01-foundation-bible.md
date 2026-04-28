# Plan 1 — Foundation + Bible Generator

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the monorepo, complete database schema, provider abstraction, configuration layer, logging, and the Bible Generator agent end-to-end so the user can create a story and generate its Bible through the web UI.

**Architecture:** pnpm monorepo with `apps/{api,web,worker}` + `packages/{ai,core,db}`. Drizzle ORM over PostgreSQL 16 + pgvector. Fastify API. Next.js 15 App Router. Provider abstraction lets us swap OpenRouter ↔ Google Direct without touching agents. All LLM calls flow through a logged service; tests use mocked providers.

**Tech Stack:** pnpm, TypeScript 5, Drizzle ORM, PostgreSQL 16 + pgvector, Fastify 5, Next.js 15, Pino, Zod, Vitest, Docker Compose.

**Critical invariants** (from spec Section 7.6):
- No hard-coded model names — only via `MODEL_CONFIG.routes`
- All tunable config in `packages/core/src/config/`
- Every LLM call logged to `llm_calls`
- **No live LLM API calls during development without explicit user consent** (tests use mocks; live tests gated by `RUN_LIVE_LLM=1` AND user confirmation)

**Definition of done for this plan:**
- `pnpm install && pnpm db:migrate && pnpm dev` brings up API + web + Postgres
- User opens `/stories/new`, submits a premise, clicks "Generate Bible" (UI shows "this triggers a real LLM call, OK?"), and sees the structured Bible saved to DB
- All deterministic code has unit tests (Vitest)
- Bible Generator has integration test using mocked provider; live-API test exists but is gated behind `RUN_LIVE_LLM=1`

---

## File Structure (locked at plan start)

```
novel-writer/
├── package.json                          # Task 1
├── pnpm-workspace.yaml                   # Task 1
├── tsconfig.base.json                    # Task 1
├── docker-compose.yml                    # Task 31
├── apps/
│   ├── api/
│   │   ├── package.json                  # Task 21
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── server.ts                 # Task 21
│   │   │   ├── plugins/
│   │   │   │   ├── logger.ts             # Task 21
│   │   │   │   └── error-handler.ts
│   │   │   └── routes/
│   │   │       ├── health.ts             # Task 21
│   │   │       ├── stories.ts            # Tasks 22-23
│   │   │       └── bible.ts              # Tasks 24-26
│   │   └── test/
│   │       ├── stories.test.ts
│   │       └── bible.test.ts
│   └── web/
│       ├── package.json                  # Task 27
│       ├── next.config.ts
│       ├── tsconfig.json
│       └── app/
│           ├── layout.tsx
│           ├── page.tsx                  # Task 28 (stories list)
│           ├── stories/
│           │   ├── new/
│           │   │   └── page.tsx          # Task 28 (create form)
│           │   └── [id]/
│           │       ├── layout.tsx        # Task 29
│           │       ├── page.tsx
│           │       └── bible/
│           │           └── page.tsx      # Task 30
│           └── lib/
│               └── api-client.ts
├── packages/
│   ├── core/
│   │   ├── package.json                  # Task 2
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                  # Task 2
│   │   │   ├── config/
│   │   │   │   ├── context.ts            # Task 14
│   │   │   │   ├── generation.ts         # Task 14
│   │   │   │   ├── models.ts             # Task 14
│   │   │   │   ├── budget.ts             # Task 14
│   │   │   │   └── effective.ts          # Task 15
│   │   │   ├── logger.ts                 # Task 16
│   │   │   ├── trace.ts                  # Task 16
│   │   │   └── types/
│   │   │       └── ids.ts                # Task 2 (branded UUID types)
│   │   └── test/
│   │       └── effective-config.test.ts
│   ├── db/
│   │   ├── package.json                  # Task 3
│   │   ├── tsconfig.json
│   │   ├── drizzle.config.ts             # Task 3
│   │   ├── src/
│   │   │   ├── index.ts                  # Task 3
│   │   │   ├── client.ts                 # Task 3
│   │   │   └── schema/
│   │   │       ├── index.ts              # Task 8
│   │   │       ├── stories.ts            # Task 4
│   │   │       ├── story-bibles.ts       # Task 4
│   │   │       ├── characters.ts         # Task 5
│   │   │       ├── factions.ts           # Task 5
│   │   │       ├── bloodlines.ts         # Task 5
│   │   │       ├── sagas.ts              # Task 5
│   │   │       ├── arcs.ts               # Task 5
│   │   │       ├── chapters.ts           # Task 6
│   │   │       ├── chapter-packets.ts    # Task 6
│   │   │       ├── timeline-events.ts    # Task 6
│   │   │       ├── open-threads.ts       # Task 6
│   │   │       ├── canon-facts.ts        # Task 7
│   │   │       ├── validations.ts        # Task 7
│   │   │       ├── llm-calls.ts          # Task 7
│   │   │       ├── planted-seeds.ts      # Task 8
│   │   │       ├── pending-canon-updates.ts # Task 8
│   │   │       ├── chapter-summaries.ts  # Task 8
│   │   │       ├── context-packets.ts    # Task 8
│   │   │       ├── prompt-versions.ts    # Task 8
│   │   │       └── story-settings.ts     # Task 8
│   │   ├── migrations/                   # Generated by Task 9
│   │   └── test/
│   │       └── schema.test.ts
│   └── ai/
│       ├── package.json                  # Task 10
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts                  # Task 10
│       │   ├── providers/
│       │   │   ├── types.ts              # Task 11
│       │   │   ├── openrouter.ts         # Task 12
│       │   │   ├── google-direct.ts      # Task 13 (stub)
│       │   │   └── mock.ts               # Task 11
│       │   ├── llm-call-logger.ts        # Task 17
│       │   ├── schemas/
│       │   │   └── bible.ts              # Task 18
│       │   ├── prompts/
│       │   │   ├── registry.ts           # Task 19
│       │   │   └── bible-generator.v1.ts # Task 19
│       │   └── agents/
│       │       └── bible-generator.ts    # Task 20
│       └── test/
│           ├── providers/
│           │   └── openrouter.test.ts
│           ├── llm-call-logger.test.ts
│           └── agents/
│               └── bible-generator.test.ts
└── .env.local.example                    # Task 31
```

---

## Task 1: Initialize monorepo root

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.nvmrc`
- Modify: `.gitignore` (already exists)

- [ ] **Step 1.1: Verify required tooling**

Run:
```bash
node --version    # expect v22.x
pnpm --version    # expect v9.x
psql --version    # expect 16.x
docker --version  # any recent
```

If any missing, install via `brew install node@22 pnpm postgresql@16 docker`.

- [ ] **Step 1.2: Write `.nvmrc`**

```
22
```

- [ ] **Step 1.3: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 1.4: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2023", "DOM"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 1.5: Write root `package.json`**

```json
{
  "name": "novel-writer",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "dev": "pnpm -r --parallel --stream dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "db:generate": "pnpm --filter @novel/db generate",
    "db:migrate": "pnpm --filter @novel/db migrate",
    "db:studio": "pnpm --filter @novel/db studio"
  },
  "devDependencies": {
    "typescript": "5.9.3",
    "@types/node": "24.12.2",
    "vitest": "3.3.0",
    "tsx": "4.21.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

- [ ] **Step 1.6: Verify `.gitignore` covers needed entries**

Read `.gitignore`. Ensure these lines are present (append any missing):

```
node_modules/
.pnpm-store/
dist/
.next/
.env.local
.env.*.local
*.tsbuildinfo
coverage/
```

- [ ] **Step 1.7: Install root deps**

```bash
pnpm install
```

Expected: lockfile updates; no errors.

- [ ] **Step 1.8: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .nvmrc .gitignore pnpm-lock.yaml
git commit -m "chore: initialize pnpm monorepo with TS base config"
```

---

## Task 2: Create `packages/core` skeleton

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/src/types/ids.ts`
- Create: `packages/core/test/sanity.test.ts`

- [ ] **Step 2.1: Write `packages/core/package.json`**

```json
{
  "name": "@novel/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./config/*": "./src/config/*.ts",
    "./logger": "./src/logger.ts",
    "./trace": "./src/trace.ts",
    "./types/*": "./src/types/*.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "echo 'no lint configured'"
  },
  "dependencies": {
    "pino": "10.3.1",
    "zod": "3.25.76"
  },
  "devDependencies": {
    "typescript": "5.9.3",
    "vitest": "3.3.0",
    "@types/node": "24.12.2"
  }
}
```

- [ ] **Step 2.2: Write `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*", "test/**/*"]
}
```

- [ ] **Step 2.3: Write branded UUID types**

`packages/core/src/types/ids.ts`:

```ts
declare const brand: unique symbol;
export type Brand<T, B> = T & { readonly [brand]: B };

export type StoryId = Brand<string, 'StoryId'>;
export type ChapterId = Brand<string, 'ChapterId'>;
export type CharacterId = Brand<string, 'CharacterId'>;
export type ArcId = Brand<string, 'ArcId'>;
export type SagaId = Brand<string, 'SagaId'>;
export type FactionId = Brand<string, 'FactionId'>;
export type BloodlineId = Brand<string, 'BloodlineId'>;
export type CanonFactId = Brand<string, 'CanonFactId'>;
export type SeedId = Brand<string, 'SeedId'>;
export type PendingUpdateId = Brand<string, 'PendingUpdateId'>;
export type ChapterPacketId = Brand<string, 'ChapterPacketId'>;
export type ContextPacketId = Brand<string, 'ContextPacketId'>;
export type PromptVersionId = Brand<string, 'PromptVersionId'>;
export type ValidationId = Brand<string, 'ValidationId'>;
export type LlmCallId = Brand<string, 'LlmCallId'>;

export const asStoryId = (s: string): StoryId => s as StoryId;
export const asChapterId = (s: string): ChapterId => s as ChapterId;
// (add other `as*` helpers as needed during implementation)
```

- [ ] **Step 2.4: Write `packages/core/src/index.ts`**

```ts
export * from './types/ids.ts';
```

- [ ] **Step 2.5: Write sanity test**

`packages/core/test/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { asStoryId, type StoryId } from '../src/types/ids.ts';

describe('branded ids', () => {
  it('asStoryId returns the same string', () => {
    const id: StoryId = asStoryId('11111111-1111-1111-1111-111111111111');
    expect(id).toBe('11111111-1111-1111-1111-111111111111');
  });
});
```

- [ ] **Step 2.6: Run install + tests**

```bash
pnpm install
pnpm --filter @novel/core test
pnpm --filter @novel/core typecheck
```

Expected: 1 test passing; typecheck clean.

- [ ] **Step 2.7: Commit**

```bash
git add packages/core
git commit -m "feat(core): scaffold @novel/core with branded id types"
```

---

## Task 3: Create `packages/db` skeleton + Drizzle config

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/drizzle.config.ts`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/.env.example`

- [ ] **Step 3.1: Write `packages/db/package.json`**

```json
{
  "name": "@novel/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts",
    "./client": "./src/client.ts"
  },
  "scripts": {
    "generate": "drizzle-kit generate",
    "migrate": "tsx src/migrate.ts",
    "studio": "drizzle-kit studio",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@novel/core": "workspace:*",
    "drizzle-orm": "0.39.3",
    "postgres": "3.4.5"
  },
  "devDependencies": {
    "drizzle-kit": "0.30.4",
    "typescript": "5.9.3",
    "vitest": "3.3.0",
    "tsx": "4.21.0",
    "@types/node": "24.12.2"
  }
}
```

- [ ] **Step 3.2: Write `packages/db/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["src/**/*", "test/**/*", "drizzle.config.ts"]
}
```

- [ ] **Step 3.3: Write `packages/db/drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is required for drizzle-kit operations');
}

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
```

- [ ] **Step 3.4: Write `packages/db/src/client.ts`**

```ts
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

let _client: postgres.Sql | null = null;

export function getSqlClient(databaseUrl?: string): postgres.Sql {
  if (_client) return _client;
  const url = databaseUrl ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  _client = postgres(url, { max: 10, idle_timeout: 30 });
  return _client;
}

export function getDb(databaseUrl?: string) {
  return drizzle(getSqlClient(databaseUrl));
}

export type Db = ReturnType<typeof getDb>;
```

- [ ] **Step 3.5: Write `packages/db/src/migrate.ts`**

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

await migrate(db, { migrationsFolder: './migrations' });
console.log('migrations applied');
await sql.end();
```

- [ ] **Step 3.6: Write `packages/db/src/index.ts`**

```ts
export { getDb, getSqlClient, type Db } from './client.ts';
export * as schema from './schema/index.ts';
```

- [ ] **Step 3.7: Write placeholder `packages/db/src/schema/index.ts`**

```ts
// Tables added incrementally in Tasks 4–8
export {};
```

- [ ] **Step 3.8: Write `.env.example`**

```
DATABASE_URL=postgresql://novel:novel@localhost:5432/novel_factory
```

- [ ] **Step 3.9: Install + typecheck**

```bash
pnpm install
pnpm --filter @novel/db typecheck
```

Expected: clean typecheck.

- [ ] **Step 3.10: Commit**

```bash
git add packages/db
git commit -m "feat(db): scaffold @novel/db with drizzle config and client"
```

---

## Task 4: Schema — `stories` and `story_bibles`

**Files:**
- Create: `packages/db/src/schema/stories.ts`
- Create: `packages/db/src/schema/story-bibles.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 4.1: Write `packages/db/src/schema/stories.ts`**

```ts
import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const stories = pgTable('stories', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  premise: text('premise').notNull(),
  genre: text('genre').default('xianxia_fantasy').notNull(),
  tone: text('tone'),
  targetChapterCount: integer('target_chapter_count').default(1000).notNull(),
  status: text('status').default('draft').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;
```

- [ ] **Step 4.2: Write `packages/db/src/schema/story-bibles.ts`**

```ts
import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

export const storyBibles = pgTable('story_bibles', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  version: integer('version').default(1).notNull(),
  worldRules: text('world_rules').notNull(),
  cultivationSystem: text('cultivation_system').notNull(),
  bloodlineSystem: text('bloodline_system').notNull(),
  styleGuide: text('style_guide').notNull(),
  forbiddenRules: text('forbidden_rules').notNull(),
  endingDirection: text('ending_direction'),
  compactSummary: text('compact_summary'),
  styleFewShots: jsonb('style_few_shots').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type StoryBible = typeof storyBibles.$inferSelect;
export type NewStoryBible = typeof storyBibles.$inferInsert;
```

- [ ] **Step 4.3: Update `packages/db/src/schema/index.ts`**

```ts
export * from './stories.ts';
export * from './story-bibles.ts';
```

- [ ] **Step 4.4: Typecheck**

```bash
pnpm --filter @novel/db typecheck
```

Expected: clean.

- [ ] **Step 4.5: Commit**

```bash
git add packages/db/src/schema
git commit -m "feat(db): add stories and story_bibles schema"
```

---

## Task 5: Schema — `characters`, `factions`, `bloodlines`, `sagas`, `arcs`

**Files:**
- Create: `packages/db/src/schema/characters.ts`
- Create: `packages/db/src/schema/factions.ts`
- Create: `packages/db/src/schema/bloodlines.ts`
- Create: `packages/db/src/schema/sagas.ts`
- Create: `packages/db/src/schema/arcs.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 5.1: Write `characters.ts`**

```ts
import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

export const characters = pgTable('characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  version: integer('version').default(1).notNull(),
  name: text('name').notNull(),
  role: text('role'),
  personality: text('personality'),
  origin: text('origin'),
  goals: jsonb('goals').$type<string[]>().default([]).notNull(),
  currentRealm: text('current_realm'),
  currentBloodlines: jsonb('current_bloodlines').$type<string[]>().default([]).notNull(),
  abilities: jsonb('abilities').$type<string[]>().default([]).notNull(),
  secrets: jsonb('secrets').$type<string[]>().default([]).notNull(),
  relationships: jsonb('relationships').$type<Record<string, string>>().default({}).notNull(),
  inventory: jsonb('inventory').$type<string[]>().default([]).notNull(),
  status: text('status').default('alive').notNull(),
  lastSeenChapter: integer('last_seen_chapter').default(0).notNull(),
  canonNotes: text('canon_notes'),
  lockedFields: jsonb('locked_fields').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
```

- [ ] **Step 5.2: Write `factions.ts`**

```ts
import { pgTable, uuid, text, jsonb } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

export const factions = pgTable('factions', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type'),
  ideology: text('ideology'),
  powerLevel: text('power_level'),
  knownMembers: jsonb('known_members').$type<string[]>().default([]).notNull(),
  alliances: jsonb('alliances').$type<string[]>().default([]).notNull(),
  enemies: jsonb('enemies').$type<string[]>().default([]).notNull(),
  status: text('status').default('active').notNull(),
  notes: text('notes'),
});

export type Faction = typeof factions.$inferSelect;
export type NewFaction = typeof factions.$inferInsert;
```

- [ ] **Step 5.3: Write `bloodlines.ts`**

```ts
import { pgTable, uuid, text, jsonb } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

export const bloodlines = pgTable('bloodlines', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  rank: text('rank'),
  source: text('source'),
  traits: jsonb('traits').$type<string[]>().default([]).notNull(),
  risks: jsonb('risks').$type<string[]>().default([]).notNull(),
  compatibility: jsonb('compatibility').$type<Record<string, string>>().default({}).notNull(),
  evolutionPath: jsonb('evolution_path').$type<string[]>().default([]).notNull(),
  notes: text('notes'),
});

export type Bloodline = typeof bloodlines.$inferSelect;
export type NewBloodline = typeof bloodlines.$inferInsert;
```

- [ ] **Step 5.4: Write `sagas.ts`**

```ts
import { pgTable, uuid, text, integer, timestamp, jsonb, unique } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

export const sagas = pgTable('sagas', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  sagaNumber: integer('saga_number').notNull(),
  title: text('title').notNull(),
  startChapter: integer('start_chapter'),
  endChapter: integer('end_chapter'),
  rollingSummary: text('rolling_summary'),
  summaryVersion: integer('summary_version').default(0).notNull(),
  mainThemes: jsonb('main_themes').$type<string[]>().default([]).notNull(),
  majorMysteries: jsonb('major_mysteries').$type<string[]>().default([]).notNull(),
  status: text('status').default('planned').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  storyNumber: unique('sagas_story_saga_number_uq').on(t.storyId, t.sagaNumber),
}));

export type Saga = typeof sagas.$inferSelect;
export type NewSaga = typeof sagas.$inferInsert;
```

- [ ] **Step 5.5: Write `arcs.ts`**

```ts
import { pgTable, uuid, text, integer, jsonb } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';
import { sagas } from './sagas.ts';

export const arcs = pgTable('arcs', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  sagaId: uuid('saga_id').references(() => sagas.id, { onDelete: 'set null' }),
  arcNumber: integer('arc_number'),
  title: text('title').notNull(),
  startChapter: integer('start_chapter'),
  endChapter: integer('end_chapter'),
  summary: text('summary'),
  mainConflict: text('main_conflict'),
  expectedCharacterChanges: jsonb('expected_character_changes').$type<string[]>().default([]).notNull(),
  expectedPowerChanges: jsonb('expected_power_changes').$type<string[]>().default([]).notNull(),
  rollingSummary: text('rolling_summary'),
  summaryVersion: integer('summary_version').default(0).notNull(),
  plantedSeedIds: jsonb('planted_seed_ids').$type<string[]>().default([]).notNull(),
  status: text('status').default('planned').notNull(),
});

export type Arc = typeof arcs.$inferSelect;
export type NewArc = typeof arcs.$inferInsert;
```

- [ ] **Step 5.6: Update `schema/index.ts`**

```ts
export * from './stories.ts';
export * from './story-bibles.ts';
export * from './characters.ts';
export * from './factions.ts';
export * from './bloodlines.ts';
export * from './sagas.ts';
export * from './arcs.ts';
```

- [ ] **Step 5.7: Typecheck + commit**

```bash
pnpm --filter @novel/db typecheck
git add packages/db/src/schema
git commit -m "feat(db): add character, faction, bloodline, saga, arc schemas"
```

---

## Task 6: Schema — `chapters`, `chapter_packets`, `timeline_events`, `open_threads`

**Files:**
- Create: `packages/db/src/schema/chapters.ts`
- Create: `packages/db/src/schema/chapter-packets.ts`
- Create: `packages/db/src/schema/timeline-events.ts`
- Create: `packages/db/src/schema/open-threads.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 6.1: Write `chapters.ts`**

```ts
import { pgTable, uuid, text, integer, timestamp, jsonb, unique } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';
import { arcs } from './arcs.ts';

export const chapters = pgTable('chapters', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  arcId: uuid('arc_id').references(() => arcs.id, { onDelete: 'set null' }),
  chapterNumber: integer('chapter_number').notNull(),
  title: text('title'),
  content: text('content'),
  summary: text('summary'),
  status: text('status').default('draft').notNull(),
  wordCount: integer('word_count').default(0).notNull(),
  validationStatus: text('validation_status').default('pending').notNull(),
  packetAuditStatus: text('packet_audit_status').default('pending').notNull(),
  deterministicValidation: jsonb('deterministic_validation'),
  llmValidationId: uuid('llm_validation_id'),
  contextCacheKey: text('context_cache_key'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  storyChapter: unique('chapters_story_chapter_uq').on(t.storyId, t.chapterNumber),
}));

export type Chapter = typeof chapters.$inferSelect;
export type NewChapter = typeof chapters.$inferInsert;
```

- [ ] **Step 6.2: Write `chapter-packets.ts`**

```ts
import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';
import { chapters } from './chapters.ts';
import { arcs } from './arcs.ts';

export const chapterPackets = pgTable('chapter_packets', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapter_id').references(() => chapters.id, { onDelete: 'cascade' }),
  arcId: uuid('arc_id').references(() => arcs.id, { onDelete: 'set null' }),
  chapterNumber: integer('chapter_number').notNull(),
  goal: text('goal').notNull(),
  requiredEvents: jsonb('required_events').$type<string[]>().default([]).notNull(),
  charactersInScene: jsonb('characters_in_scene').$type<string[]>().default([]).notNull(),
  conflict: text('conflict'),
  cliffhanger: text('cliffhanger'),
  forbiddenMoves: jsonb('forbidden_moves').$type<string[]>().default([]).notNull(),
  contextNotes: text('context_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ChapterPacket = typeof chapterPackets.$inferSelect;
export type NewChapterPacket = typeof chapterPackets.$inferInsert;
```

- [ ] **Step 6.3: Write `timeline-events.ts`**

```ts
import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

export const timelineEvents = pgTable('timeline_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  chapterNumber: integer('chapter_number').notNull(),
  eventType: text('event_type'),
  eventText: text('event_text').notNull(),
  importance: text('importance').default('medium').notNull(),
  relatedCharacterIds: jsonb('related_character_ids').$type<string[]>().default([]).notNull(),
  relatedThreadIds: jsonb('related_thread_ids').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type NewTimelineEvent = typeof timelineEvents.$inferInsert;
```

- [ ] **Step 6.4: Write `open-threads.ts`**

```ts
import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

export const openThreads = pgTable('open_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  openedChapter: integer('opened_chapter'),
  plannedResolutionChapter: integer('planned_resolution_chapter'),
  status: text('status').default('open').notNull(),
  hints: jsonb('hints').$type<string[]>().default([]).notNull(),
  relatedCharacters: jsonb('related_characters').$type<string[]>().default([]).notNull(),
  resolutionNotes: text('resolution_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type OpenThread = typeof openThreads.$inferSelect;
export type NewOpenThread = typeof openThreads.$inferInsert;
```

- [ ] **Step 6.5: Update `schema/index.ts`**

Append:

```ts
export * from './chapters.ts';
export * from './chapter-packets.ts';
export * from './timeline-events.ts';
export * from './open-threads.ts';
```

- [ ] **Step 6.6: Typecheck + commit**

```bash
pnpm --filter @novel/db typecheck
git add packages/db/src/schema
git commit -m "feat(db): add chapter, packet, timeline, threads schemas"
```

---

## Task 7: Schema — `canon_facts`, `validations`, `llm_calls`

**Files:**
- Create: `packages/db/src/schema/canon-facts.ts`
- Create: `packages/db/src/schema/validations.ts`
- Create: `packages/db/src/schema/llm-calls.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 7.1: Write `canon-facts.ts`**

`embedding` is set up with `vector(1536)` via the postgres `vector` type from pgvector. We use a custom Drizzle column for vectors.

```ts
import { pgTable, uuid, text, integer, timestamp, jsonb, boolean, customType } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

const vector1536 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return value.replace(/[\[\]]/g, '').split(',').map(Number);
  },
});

export const canonFacts = pgTable('canon_facts', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  fact: text('fact').notNull(),
  sourceChapter: integer('source_chapter'),
  importance: text('importance').default('medium').notNull(),
  locked: boolean('locked').default(false).notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  embedding: vector1536('embedding'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type CanonFact = typeof canonFacts.$inferSelect;
export type NewCanonFact = typeof canonFacts.$inferInsert;
export { vector1536 };
```

- [ ] **Step 7.2: Write `validations.ts`**

```ts
import { pgTable, uuid, boolean, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';
import { chapters } from './chapters.ts';

export const validations = pgTable('validations', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  pass: boolean('pass').notNull(),
  severity: text('severity').default('medium').notNull(),
  issues: jsonb('issues').$type<unknown[]>().default([]).notNull(),
  requiredFixes: jsonb('required_fixes').$type<string[]>().default([]).notNull(),
  validatorModel: text('validator_model'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Validation = typeof validations.$inferSelect;
export type NewValidation = typeof validations.$inferInsert;
```

- [ ] **Step 7.3: Write `llm-calls.ts`**

```ts
import { pgTable, uuid, text, integer, timestamp, numeric } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';
import { chapters } from './chapters.ts';

export const llmCalls = pgTable('llm_calls', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').references(() => stories.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapter_id').references(() => chapters.id, { onDelete: 'cascade' }),
  agentRole: text('agent_role').notNull(),
  model: text('model').notNull(),
  promptVersion: text('prompt_version'),
  inputTokens: integer('input_tokens').default(0).notNull(),
  outputTokens: integer('output_tokens').default(0).notNull(),
  cachedInputTokens: integer('cached_input_tokens').default(0).notNull(),
  estimatedCostUsd: numeric('estimated_cost_usd', { precision: 10, scale: 6 }),
  traceId: text('trace_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type LlmCall = typeof llmCalls.$inferSelect;
export type NewLlmCall = typeof llmCalls.$inferInsert;
```

- [ ] **Step 7.4: Update `schema/index.ts`**

Append:

```ts
export * from './canon-facts.ts';
export * from './validations.ts';
export * from './llm-calls.ts';
```

- [ ] **Step 7.5: Typecheck + commit**

```bash
pnpm --filter @novel/db typecheck
git add packages/db/src/schema
git commit -m "feat(db): add canon_facts (with pgvector), validations, llm_calls"
```

---

## Task 8: Schema — v2-only tables (planted_seeds, pending_canon_updates, chapter_summaries, context_packets, prompt_versions, story_settings)

**Files:**
- Create: `packages/db/src/schema/planted-seeds.ts`
- Create: `packages/db/src/schema/pending-canon-updates.ts`
- Create: `packages/db/src/schema/chapter-summaries.ts`
- Create: `packages/db/src/schema/context-packets.ts`
- Create: `packages/db/src/schema/prompt-versions.ts`
- Create: `packages/db/src/schema/story-settings.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 8.1: Write `planted-seeds.ts`**

```ts
import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

export const plantedSeeds = pgTable('planted_seeds', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  seedText: text('seed_text').notNull(),
  payoffDescription: text('payoff_description').notNull(),
  plantWindowStart: integer('plant_window_start').notNull(),
  plantWindowEnd: integer('plant_window_end').notNull(),
  payoffChapter: integer('payoff_chapter'),
  plantedInChapter: integer('planted_in_chapter'),
  status: text('status').default('pending').notNull(),
  createdByAgent: text('created_by_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byStoryStatusWindow: index('planted_seeds_story_status_window_idx').on(t.storyId, t.status, t.plantWindowStart),
}));

export type PlantedSeed = typeof plantedSeeds.$inferSelect;
export type NewPlantedSeed = typeof plantedSeeds.$inferInsert;
```

- [ ] **Step 8.2: Write `pending-canon-updates.ts`**

```ts
import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';
import { chapters } from './chapters.ts';

export const pendingCanonUpdates = pgTable('pending_canon_updates', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  updateType: text('update_type').notNull(),
  targetTable: text('target_table').notNull(),
  targetId: uuid('target_id'),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  conflictStatus: text('conflict_status').default('none').notNull(),
  conflictReasons: jsonb('conflict_reasons').$type<string[]>().default([]).notNull(),
  resolution: text('resolution').default('pending').notNull(),
  reviewedBy: text('reviewed_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
}, (t) => ({
  byStoryStatus: index('pending_canon_story_resolution_conflict_idx').on(t.storyId, t.resolution, t.conflictStatus),
}));

export type PendingCanonUpdate = typeof pendingCanonUpdates.$inferSelect;
export type NewPendingCanonUpdate = typeof pendingCanonUpdates.$inferInsert;
```

- [ ] **Step 8.3: Write `chapter-summaries.ts`**

```ts
import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';
import { chapters } from './chapters.ts';
import { vector1536 } from './canon-facts.ts';

export const chapterSummaries = pgTable('chapter_summaries', {
  chapterId: uuid('chapter_id').primaryKey().references(() => chapters.id, { onDelete: 'cascade' }),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  chapterNumber: integer('chapter_number').notNull(),
  shortSummary: text('short_summary').notNull(),
  detailedSummary: text('detailed_summary').notNull(),
  embedding: vector1536('embedding'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ChapterSummary = typeof chapterSummaries.$inferSelect;
export type NewChapterSummary = typeof chapterSummaries.$inferInsert;
```

- [ ] **Step 8.4: Write `context-packets.ts`**

```ts
import { pgTable, uuid, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { chapters } from './chapters.ts';

export const contextPackets = pgTable('context_packets', {
  id: uuid('id').primaryKey().defaultRandom(),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  hotTierHash: text('hot_tier_hash').notNull(),
  warmTierHash: text('warm_tier_hash').notNull(),
  coldPayload: jsonb('cold_payload').$type<Record<string, unknown>>().notNull(),
  totalInputTokens: integer('total_input_tokens'),
  cachedInputTokens: integer('cached_input_tokens'),
  configSnapshot: jsonb('config_snapshot').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ContextPacket = typeof contextPackets.$inferSelect;
export type NewContextPacket = typeof contextPackets.$inferInsert;
```

- [ ] **Step 8.5: Write `prompt-versions.ts`**

```ts
import { pgTable, uuid, text, boolean, timestamp, unique } from 'drizzle-orm/pg-core';

export const promptVersions = pgTable('prompt_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentRole: text('agent_role').notNull(),
  version: text('version').notNull(),
  template: text('template').notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  roleVersionUnique: unique('prompt_versions_role_version_uq').on(t.agentRole, t.version),
}));

export type PromptVersion = typeof promptVersions.$inferSelect;
export type NewPromptVersion = typeof promptVersions.$inferInsert;
```

- [ ] **Step 8.6: Write `story-settings.ts`**

```ts
import { pgTable, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

export const storySettings = pgTable('story_settings', {
  storyId: uuid('story_id').primaryKey().references(() => stories.id, { onDelete: 'cascade' }),
  overrides: jsonb('overrides').$type<Record<string, unknown>>().default({}).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type StorySettings = typeof storySettings.$inferSelect;
export type NewStorySettings = typeof storySettings.$inferInsert;
```

- [ ] **Step 8.7: Update `schema/index.ts`**

Append:

```ts
export * from './planted-seeds.ts';
export * from './pending-canon-updates.ts';
export * from './chapter-summaries.ts';
export * from './context-packets.ts';
export * from './prompt-versions.ts';
export * from './story-settings.ts';
```

- [ ] **Step 8.8: Typecheck + commit**

```bash
pnpm --filter @novel/db typecheck
git add packages/db/src/schema
git commit -m "feat(db): add v2 tables (seeds, pending updates, summaries, etc.)"
```

---

## Task 9: Generate first migration + verify on Postgres

**Files:**
- Create: `packages/db/migrations/0000_*.sql` (generated)
- Create: `docker-compose.dev.yml` (Postgres only for now)

- [ ] **Step 9.1: Write minimal `docker-compose.dev.yml`**

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    restart: unless-stopped
    environment:
      POSTGRES_USER: novel
      POSTGRES_PASSWORD: novel
      POSTGRES_DB: novel_factory
    ports:
      - "5432:5432"
    volumes:
      - novel_pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U novel -d novel_factory"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  novel_pg_data:
```

- [ ] **Step 9.2: Start Postgres**

```bash
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
```

Expected: `postgres` running, healthy.

- [ ] **Step 9.3: Enable pgvector extension**

```bash
docker compose -f docker-compose.dev.yml exec postgres \
  psql -U novel -d novel_factory -c 'CREATE EXTENSION IF NOT EXISTS vector;'
```

Expected: `CREATE EXTENSION` (or `NOTICE: extension "vector" already exists`).

- [ ] **Step 9.4: Generate Drizzle migration**

```bash
cd packages/db
DATABASE_URL=postgresql://novel:novel@localhost:5432/novel_factory pnpm generate
```

Expected: a new file under `packages/db/migrations/0000_*.sql` containing CREATE TABLE statements for all 20 tables.

- [ ] **Step 9.5: Apply migration**

```bash
DATABASE_URL=postgresql://novel:novel@localhost:5432/novel_factory pnpm migrate
```

Expected: `migrations applied`.

- [ ] **Step 9.6: Verify all 20 tables exist**

```bash
docker compose -f docker-compose.dev.yml exec postgres \
  psql -U novel -d novel_factory -c "\dt"
```

Expected: list shows: `arcs, bloodlines, canon_facts, chapter_packets, chapter_summaries, chapters, characters, context_packets, factions, llm_calls, open_threads, pending_canon_updates, planted_seeds, prompt_versions, sagas, stories, story_bibles, story_settings, timeline_events, validations` (20 tables).

- [ ] **Step 9.7: Write smoke test for schema**

`packages/db/test/schema.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb, getSqlClient } from '../src/client.ts';
import { stories, storyBibles } from '../src/schema/index.ts';
import { eq } from 'drizzle-orm';

const TEST_DB_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://novel:novel@localhost:5432/novel_factory';

describe('schema smoke', () => {
  const db = getDb(TEST_DB_URL);

  it('can insert and query a story', async () => {
    const [inserted] = await db.insert(stories).values({
      title: 'Test Story',
      premise: 'A test premise',
    }).returning();
    expect(inserted.id).toMatch(/^[0-9a-f-]{36}$/);

    const found = await db.select().from(stories).where(eq(stories.id, inserted.id));
    expect(found).toHaveLength(1);
    expect(found[0].title).toBe('Test Story');

    await db.delete(stories).where(eq(stories.id, inserted.id));
  });

  it('cascade-deletes story bible when story removed', async () => {
    const [story] = await db.insert(stories).values({ title: 'X', premise: 'Y' }).returning();
    await db.insert(storyBibles).values({
      storyId: story.id,
      worldRules: 'r',
      cultivationSystem: 'c',
      bloodlineSystem: 'b',
      styleGuide: 's',
      forbiddenRules: 'f',
    });
    await db.delete(stories).where(eq(stories.id, story.id));
    const remaining = await db.select().from(storyBibles).where(eq(storyBibles.storyId, story.id));
    expect(remaining).toHaveLength(0);
  });

  afterAll(async () => {
    await getSqlClient(TEST_DB_URL).end();
  });
});
```

- [ ] **Step 9.8: Run tests**

```bash
TEST_DATABASE_URL=postgresql://novel:novel@localhost:5432/novel_factory pnpm --filter @novel/db test
```

Expected: 2 passing.

- [ ] **Step 9.9: Commit**

```bash
git add docker-compose.dev.yml packages/db/migrations packages/db/test
git commit -m "feat(db): add docker-compose, generate migration, schema smoke tests"
```

---

## Task 10: `packages/ai` skeleton

**Files:**
- Create: `packages/ai/package.json`
- Create: `packages/ai/tsconfig.json`
- Create: `packages/ai/src/index.ts`

- [ ] **Step 10.1: Write `packages/ai/package.json`**

```json
{
  "name": "@novel/ai",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./providers/*": "./src/providers/*.ts",
    "./agents/*": "./src/agents/*.ts",
    "./schemas/*": "./src/schemas/*.ts",
    "./prompts/*": "./src/prompts/*.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@novel/core": "workspace:*",
    "@novel/db": "workspace:*",
    "zod": "3.25.76"
  },
  "devDependencies": {
    "typescript": "5.9.3",
    "vitest": "3.3.0",
    "@types/node": "24.12.2"
  }
}
```

- [ ] **Step 10.2: Write `packages/ai/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*", "test/**/*"]
}
```

- [ ] **Step 10.3: Placeholder `src/index.ts`**

```ts
export {};
```

- [ ] **Step 10.4: Install + typecheck**

```bash
pnpm install
pnpm --filter @novel/ai typecheck
```

Expected: clean.

- [ ] **Step 10.5: Commit**

```bash
git add packages/ai
git commit -m "feat(ai): scaffold @novel/ai package"
```

---

## Task 11: Provider abstraction interface + Mock provider

**Files:**
- Create: `packages/ai/src/providers/types.ts`
- Create: `packages/ai/src/providers/mock.ts`
- Create: `packages/ai/test/providers/mock.test.ts`

- [ ] **Step 11.1: Write `providers/types.ts`**

```ts
export type Role = 'system' | 'user' | 'assistant';

export interface Message {
  role: Role;
  content: string;
}

export interface JsonSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface CompletionRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  responseSchema?: JsonSchema;       // structured output
  cacheBreakpoints?: number[];       // indices in messages array where prefix is cacheable
  metadata?: { agentRole?: string; promptVersion?: string; traceId?: string };
}

export interface CompletionUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
}

export interface CompletionResponse {
  content: string;          // raw text — JSON if responseSchema was used
  usage: CompletionUsage;
  finishReason: 'stop' | 'length' | 'error' | 'content_filter';
  raw: unknown;
}

export interface LLMProvider {
  name: string;
  complete(req: CompletionRequest): Promise<CompletionResponse>;
}
```

- [ ] **Step 11.2: Write `providers/mock.ts`**

```ts
import type { CompletionRequest, CompletionResponse, LLMProvider } from './types.ts';

export type MockResponder =
  | { kind: 'fixed'; content: string; usage?: Partial<CompletionResponse['usage']> }
  | { kind: 'fn'; fn: (req: CompletionRequest) => CompletionResponse | Promise<CompletionResponse> };

export interface MockProviderOptions {
  responder: MockResponder;
}

export class MockProvider implements LLMProvider {
  readonly name = 'mock';
  private callLog: CompletionRequest[] = [];

  constructor(private opts: MockProviderOptions) {}

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    this.callLog.push(req);
    if (this.opts.responder.kind === 'fixed') {
      const usage = this.opts.responder.usage ?? {};
      return {
        content: this.opts.responder.content,
        usage: {
          inputTokens: usage.inputTokens ?? 100,
          outputTokens: usage.outputTokens ?? 50,
          cachedInputTokens: usage.cachedInputTokens ?? 0,
        },
        finishReason: 'stop',
        raw: { mocked: true },
      };
    }
    return this.opts.responder.fn(req);
  }

  getCalls(): readonly CompletionRequest[] {
    return this.callLog;
  }

  reset(): void {
    this.callLog = [];
  }
}
```

- [ ] **Step 11.3: Write tests for mock**

`packages/ai/test/providers/mock.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { MockProvider } from '../../src/providers/mock.ts';

describe('MockProvider', () => {
  it('returns fixed content', async () => {
    const p = new MockProvider({
      responder: { kind: 'fixed', content: 'hello' },
    });
    const r = await p.complete({
      model: 'x',
      messages: [{ role: 'user', content: 'ping' }],
    });
    expect(r.content).toBe('hello');
    expect(r.usage.inputTokens).toBe(100);
    expect(p.getCalls()).toHaveLength(1);
  });

  it('uses function responder', async () => {
    const p = new MockProvider({
      responder: {
        kind: 'fn',
        fn: (req) => ({
          content: `echo: ${req.messages[0].content}`,
          usage: { inputTokens: 1, outputTokens: 1, cachedInputTokens: 0 },
          finishReason: 'stop',
          raw: null,
        }),
      },
    });
    const r = await p.complete({ model: 'x', messages: [{ role: 'user', content: 'ping' }] });
    expect(r.content).toBe('echo: ping');
  });
});
```

- [ ] **Step 11.4: Run tests**

```bash
pnpm --filter @novel/ai test
```

Expected: 2 passing.

- [ ] **Step 11.5: Commit**

```bash
git add packages/ai/src/providers packages/ai/test/providers
git commit -m "feat(ai): add provider abstraction interface and mock provider"
```

---

## Task 12: OpenRouter provider implementation

**Files:**
- Create: `packages/ai/src/providers/openrouter.ts`
- Create: `packages/ai/test/providers/openrouter.test.ts`
- Modify: `packages/ai/package.json` (no new deps; uses fetch)

⚠️ **No live API calls in this task.** Tests use a stubbed `fetch`.

- [ ] **Step 12.1: Write `providers/openrouter.ts`**

```ts
import type { CompletionRequest, CompletionResponse, LLMProvider, Message } from './types.ts';

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  httpReferer?: string;
  xTitle?: string;
  fetchImpl?: typeof fetch;
}

interface OpenRouterChatPayload {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  response_format?: {
    type: 'json_schema';
    json_schema: { name: string; schema: unknown; strict: true };
  };
}

interface OpenRouterChatResponse {
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
}

const DEFAULT_BASE = 'https://openrouter.ai/api/v1';

export class OpenRouterProvider implements LLMProvider {
  readonly name = 'openrouter';

  constructor(private config: OpenRouterConfig) {
    if (!config.apiKey) throw new Error('OpenRouter apiKey is required');
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const fetchFn = this.config.fetchImpl ?? globalThis.fetch;
    const body: OpenRouterChatPayload = {
      model: req.model,
      messages: req.messages.map(this.toOpenRouterMessage),
      temperature: req.temperature,
      top_p: req.topP,
      max_tokens: req.maxOutputTokens,
    };
    if (req.responseSchema) {
      body.response_format = {
        type: 'json_schema',
        json_schema: { name: 'response', schema: req.responseSchema, strict: true },
      };
    }
    const url = (this.config.baseUrl ?? DEFAULT_BASE) + '/chat/completions';
    const res = await fetchFn(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...(this.config.httpReferer ? { 'HTTP-Referer': this.config.httpReferer } : {}),
        ...(this.config.xTitle ? { 'X-Title': this.config.xTitle } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenRouter error ${res.status}: ${text}`);
    }
    const data = (await res.json()) as OpenRouterChatResponse;
    const choice = data.choices?.[0];
    if (!choice) throw new Error('OpenRouter returned no choices');
    const inputTokens = data.usage?.prompt_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? 0;
    const cachedInputTokens = data.usage?.prompt_tokens_details?.cached_tokens ?? 0;
    return {
      content: choice.message.content,
      usage: { inputTokens, outputTokens, cachedInputTokens },
      finishReason: this.mapFinish(choice.finish_reason),
      raw: data,
    };
  }

  private toOpenRouterMessage(m: Message): { role: string; content: string } {
    return { role: m.role, content: m.content };
  }

  private mapFinish(r: string): CompletionResponse['finishReason'] {
    if (r === 'stop' || r === 'length' || r === 'content_filter') return r;
    return 'error';
  }
}
```

- [ ] **Step 12.2: Write tests with stub fetch**

`packages/ai/test/providers/openrouter.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { OpenRouterProvider } from '../../src/providers/openrouter.ts';

function makeFetchStub(payload: unknown, status = 200) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
    json: async () => payload,
  })) as unknown as typeof fetch;
}

describe('OpenRouterProvider', () => {
  it('parses successful response', async () => {
    const fetchImpl = makeFetchStub({
      choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, prompt_tokens_details: { cached_tokens: 7 } },
    });
    const p = new OpenRouterProvider({ apiKey: 'k', fetchImpl });
    const r = await p.complete({ model: 'm', messages: [{ role: 'user', content: 'hi' }] });
    expect(r.content).toBe('ok');
    expect(r.usage).toEqual({ inputTokens: 10, outputTokens: 5, cachedInputTokens: 7 });
    expect(r.finishReason).toBe('stop');
  });

  it('throws on non-OK response', async () => {
    const fetchImpl = makeFetchStub({ error: 'bad' }, 500);
    const p = new OpenRouterProvider({ apiKey: 'k', fetchImpl });
    await expect(p.complete({ model: 'm', messages: [{ role: 'user', content: 'hi' }] }))
      .rejects.toThrow(/OpenRouter error 500/);
  });

  it('passes responseSchema as response_format', async () => {
    let captured: { body?: string } = {};
    const fetchImpl = vi.fn(async (_url, init) => {
      captured.body = init?.body as string;
      return {
        ok: true,
        status: 200,
        text: async () => '',
        json: async () => ({ choices: [{ message: { content: '{}' }, finish_reason: 'stop' }] }),
      };
    }) as unknown as typeof fetch;
    const p = new OpenRouterProvider({ apiKey: 'k', fetchImpl });
    await p.complete({
      model: 'm',
      messages: [{ role: 'user', content: 'hi' }],
      responseSchema: { type: 'object', properties: { a: { type: 'string' } } },
    });
    expect(captured.body).toMatch(/"response_format"/);
    expect(captured.body).toMatch(/"json_schema"/);
  });

  it('throws when apiKey is empty', () => {
    expect(() => new OpenRouterProvider({ apiKey: '' })).toThrow(/apiKey/);
  });
});
```

- [ ] **Step 12.3: Run tests**

```bash
pnpm --filter @novel/ai test
```

Expected: 6 passing total (4 new + 2 mock).

- [ ] **Step 12.4: Commit**

```bash
git add packages/ai/src/providers/openrouter.ts packages/ai/test/providers/openrouter.test.ts
git commit -m "feat(ai): add OpenRouter provider with stubbed fetch tests"
```

---

## Task 13: Google Direct provider stub

**Files:**
- Create: `packages/ai/src/providers/google-direct.ts`

This is a placeholder implementation that throws `NotImplementedError`. We will fully implement it later if OpenRouter caching turns out to be insufficient (per spec Section 6.6).

- [ ] **Step 13.1: Write stub**

`packages/ai/src/providers/google-direct.ts`:

```ts
import type { CompletionRequest, CompletionResponse, LLMProvider } from './types.ts';

export class GoogleDirectProvider implements LLMProvider {
  readonly name = 'google-direct';
  async complete(_req: CompletionRequest): Promise<CompletionResponse> {
    throw new Error('GoogleDirectProvider not implemented yet — see spec Section 6.6 mitigation strategy');
  }
}
```

- [ ] **Step 13.2: Commit**

```bash
git add packages/ai/src/providers/google-direct.ts
git commit -m "feat(ai): add GoogleDirectProvider stub (deferred impl)"
```

---

## Task 14: Configuration constants

**Files:**
- Create: `packages/core/src/config/context.ts`
- Create: `packages/core/src/config/generation.ts`
- Create: `packages/core/src/config/models.ts`
- Create: `packages/core/src/config/budget.ts`

These are direct copies of the spec Section 4.7. No tests required — they're literal constant definitions, but the loader (Task 15) is tested.

- [ ] **Step 14.1: Write `config/context.ts`**

```ts
export const CONTEXT_CONFIG = {
  TOKEN_BUDGET_NORMAL: 6000,
  TOKEN_BUDGET_IMPORTANT: 10000,
  TOKEN_BUDGET_HOT_TARGET: 2500,
  TOKEN_BUDGET_WARM_TARGET: 2000,
  TOKEN_BUDGET_COLD_TARGET: 1500,

  RECENT_CHAPTER_SUMMARIES_COUNT: 5,
  RETRIEVED_CANON_FACTS_TOP_K: 8,
  RETRIEVED_PAST_CHAPTERS_TOP_K: 3,
  RETRIEVED_PAST_CHAPTERS_MIN_GAP: 5,
  RETRIEVAL_MIN_IMPORTANCE: ['high', 'locked'] as const,

  STYLE_FEWSHOT_COUNT: 3,
  STYLE_FEWSHOT_MAX_TOKENS_EACH: 250,

  ARC_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS: 5,
  SAGA_ROLLING_SUMMARY_REFRESH_EVERY_N_CHAPTERS: 20,
  CHAPTER_SHORT_SUMMARY_TARGET_TOKENS: 200,
  CHAPTER_DETAILED_SUMMARY_TARGET_TOKENS: 500,

  PAST_REFERENCE_KEYWORDS: ['lần trước', 'trước đây', 'năm xưa', 'thuở nhỏ', 'kiếp trước', 'callback'],
  PAST_REFERENCE_USE_LLM_CLASSIFIER: false,

  SHRINK_ORDER: [
    'retrievedPastChapters',
    'retrievedFacts',
    'recentSummaries',
    'activeCharactersCompactMode',
  ] as const,
} as const;

export type ContextConfig = typeof CONTEXT_CONFIG;
```

- [ ] **Step 14.2: Write `config/generation.ts`**

```ts
export const GENERATION_CONFIG = {
  CHAPTER_TARGET_WORDS_MIN: 2000,
  CHAPTER_TARGET_WORDS_MAX: 3000,
  CHAPTER_HARD_FAIL_WORDS_MIN: 1500,
  CHAPTER_HARD_FAIL_WORDS_MAX: 4000,

  MAX_REALM_JUMP_PER_CHAPTER: 1,
  MAX_REALM_JUMP_PER_ARC: 1,
  MAX_NEW_BLOODLINES_PER_ARC: 2,

  PACKET_REGENERATE_MAX_ATTEMPTS: 1,
  WRITER_RETRY_ON_API_ERROR: 3,
  AUTO_FIX_MAX_ATTEMPTS: 1,
  AUTO_FIX_TRIGGER_SEVERITIES: ['low', 'medium'] as const,
  STOP_SEVERITIES: ['high', 'critical'] as const,

  DETERMINISTIC_VALIDATOR_BLOCKING_ON_FAIL: true,
  LLM_VALIDATOR_TEMPERATURE: 0.1,
  WRITER_TEMPERATURE: 0.85,
  WRITER_TOP_P: 0.95,

  SAFE_MODE_BATCH_SIZE: 1,
  SEMI_AUTO_BATCH_SIZE: 5,
  FULL_AUTO_BATCH_SIZE: 30,

  HIGH_STAKES_REVIEW_AT_ARC_END: true,
  HIGH_STAKES_REVIEW_ON_CRITICAL: true,

  AUTO_ESCALATE_TO_SAFE_MODE: {
    FIRST_CHAPTER_OF_STORY: true,
    FIRST_CHAPTER_OF_ARC: true,
    LAST_CHAPTER_OF_ARC: true,
    ON_VALIDATOR_HIGH: true,
    ON_VALIDATOR_CRITICAL: true,
    ON_BLOCKING_CONFLICT: true,
  },
} as const;

export type GenerationConfig = typeof GENERATION_CONFIG;
```

- [ ] **Step 14.3: Write `config/models.ts`**

```ts
export const MODEL_CONFIG = {
  routes: {
    bible_generator: process.env.BIBLE_MODEL ?? 'google/gemini-2.5-pro',
    saga_planner: process.env.SAGA_PLANNER_MODEL ?? 'google/gemini-2.5-pro',
    arc_planner: process.env.ARC_PLANNER_MODEL ?? 'google/gemini-2.5-flash',
    packet_generator: process.env.PACKET_MODEL ?? 'google/gemini-2.5-flash-lite',
    writer: process.env.WRITER_MODEL ?? 'google/gemini-2.5-flash-lite',
    auto_fixer: process.env.FIXER_MODEL ?? 'google/gemini-2.5-flash-lite',
    llm_validator: process.env.VALIDATOR_MODEL ?? 'google/gemini-2.5-flash-lite',
    canon_extractor: process.env.EXTRACTOR_MODEL ?? 'google/gemini-2.5-flash-lite',
    summary_compactor: process.env.COMPACTOR_MODEL ?? 'google/gemini-2.5-flash-lite',
    high_stakes_reviewer: process.env.HIGH_STAKES_MODEL ?? 'google/gemini-2.5-pro',
  },
  pricing: {
    'google/gemini-2.5-flash-lite': { input: 0.10, cachedInput: 0.025, output: 0.40 },
    'google/gemini-2.5-flash':      { input: 0.30, cachedInput: 0.075, output: 2.50 },
    'google/gemini-2.5-pro':        { input: 1.25, cachedInput: 0.31,  output: 10.00 },
  },
} as const;

export type AgentRole = keyof typeof MODEL_CONFIG.routes;
export type ModelConfig = typeof MODEL_CONFIG;

export function modelFor(role: AgentRole): string {
  return MODEL_CONFIG.routes[role];
}

export function pricingFor(model: string): { input: number; cachedInput: number; output: number } | undefined {
  return MODEL_CONFIG.pricing[model as keyof typeof MODEL_CONFIG.pricing];
}

export function estimateCostUsd(model: string, usage: {
  inputTokens: number; outputTokens: number; cachedInputTokens: number;
}): number {
  const p = pricingFor(model);
  if (!p) return 0;
  const freshInput = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  return (
    (freshInput / 1_000_000) * p.input +
    (usage.cachedInputTokens / 1_000_000) * p.cachedInput +
    (usage.outputTokens / 1_000_000) * p.output
  );
}
```

- [ ] **Step 14.4: Write `config/budget.ts`**

```ts
export const BUDGET_GUARDRAILS = {
  PER_CHAPTER_HARD_CAP_USD: 0.05,
  PER_STORY_DAILY_CAP_USD: 5.0,
  PER_STORY_MONTHLY_CAP_USD: 50.0,
  ALERT_THRESHOLD_PERCENT: 80,
} as const;

export type BudgetGuardrails = typeof BUDGET_GUARDRAILS;
```

- [ ] **Step 14.5: Typecheck + commit**

```bash
pnpm --filter @novel/core typecheck
git add packages/core/src/config
git commit -m "feat(core): add tunable config constants (context, generation, models, budget)"
```

---

## Task 15: `getEffectiveConfig` (default ← env ← per-story overrides)

**Files:**
- Create: `packages/core/src/config/effective.ts`
- Create: `packages/core/test/effective-config.test.ts`

- [ ] **Step 15.1: Write failing test**

`packages/core/test/effective-config.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mergeOverrides } from '../src/config/effective.ts';
import { CONTEXT_CONFIG } from '../src/config/context.ts';
import { GENERATION_CONFIG } from '../src/config/generation.ts';

describe('mergeOverrides', () => {
  it('returns defaults when overrides empty', () => {
    const r = mergeOverrides({});
    expect(r.context.TOKEN_BUDGET_NORMAL).toBe(CONTEXT_CONFIG.TOKEN_BUDGET_NORMAL);
    expect(r.generation.CHAPTER_TARGET_WORDS_MIN).toBe(GENERATION_CONFIG.CHAPTER_TARGET_WORDS_MIN);
  });

  it('overrides scalar fields', () => {
    const r = mergeOverrides({
      context: { TOKEN_BUDGET_NORMAL: 9999 },
      generation: { CHAPTER_TARGET_WORDS_MAX: 5000 },
    });
    expect(r.context.TOKEN_BUDGET_NORMAL).toBe(9999);
    expect(r.generation.CHAPTER_TARGET_WORDS_MAX).toBe(5000);
    // unrelated fields untouched
    expect(r.context.RECENT_CHAPTER_SUMMARIES_COUNT).toBe(CONTEXT_CONFIG.RECENT_CHAPTER_SUMMARIES_COUNT);
  });

  it('deep-merges nested objects', () => {
    const r = mergeOverrides({
      generation: {
        AUTO_ESCALATE_TO_SAFE_MODE: { FIRST_CHAPTER_OF_STORY: false },
      },
    });
    expect(r.generation.AUTO_ESCALATE_TO_SAFE_MODE.FIRST_CHAPTER_OF_STORY).toBe(false);
    expect(r.generation.AUTO_ESCALATE_TO_SAFE_MODE.ON_VALIDATOR_CRITICAL).toBe(true);
  });
});
```

Run:
```bash
pnpm --filter @novel/core test
```
Expected: FAIL with "mergeOverrides not exported".

- [ ] **Step 15.2: Implement**

`packages/core/src/config/effective.ts`:

```ts
import { CONTEXT_CONFIG, type ContextConfig } from './context.ts';
import { GENERATION_CONFIG, type GenerationConfig } from './generation.ts';
import { BUDGET_GUARDRAILS, type BudgetGuardrails } from './budget.ts';

export interface EffectiveConfig {
  context: ContextConfig;
  generation: GenerationConfig;
  budget: BudgetGuardrails;
}

export interface ConfigOverrides {
  context?: DeepPartial<ContextConfig>;
  generation?: DeepPartial<GenerationConfig>;
  budget?: DeepPartial<BudgetGuardrails>;
}

type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

function deepMerge<T>(base: T, patch: DeepPartial<T> | undefined): T {
  if (!patch) return base;
  if (typeof base !== 'object' || base === null) return (patch as T) ?? base;
  if (Array.isArray(base)) return (patch as T) ?? base;
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    const baseVal = (base as Record<string, unknown>)[k];
    if (typeof baseVal === 'object' && baseVal !== null && !Array.isArray(baseVal)) {
      result[k] = deepMerge(baseVal, v as DeepPartial<typeof baseVal>);
    } else if (v !== undefined) {
      result[k] = v;
    }
  }
  return result as T;
}

export function mergeOverrides(overrides: ConfigOverrides): EffectiveConfig {
  return {
    context: deepMerge(CONTEXT_CONFIG, overrides.context),
    generation: deepMerge(GENERATION_CONFIG, overrides.generation),
    budget: deepMerge(BUDGET_GUARDRAILS, overrides.budget),
  };
}
```

- [ ] **Step 15.3: Re-run tests**

```bash
pnpm --filter @novel/core test
```

Expected: 4 passing (3 new + 1 sanity).

- [ ] **Step 15.4: Add per-story loader (reads from DB)**

Append to `packages/core/src/config/effective.ts`:

```ts
export interface StoryOverridesProvider {
  load(storyId: string): Promise<ConfigOverrides>;
}

export async function getEffectiveConfig(
  storyId: string,
  provider: StoryOverridesProvider,
): Promise<EffectiveConfig> {
  const overrides = await provider.load(storyId);
  return mergeOverrides(overrides);
}
```

- [ ] **Step 15.5: Update `core/src/index.ts`**

```ts
export * from './types/ids.ts';
export { CONTEXT_CONFIG, type ContextConfig } from './config/context.ts';
export { GENERATION_CONFIG, type GenerationConfig } from './config/generation.ts';
export { MODEL_CONFIG, type ModelConfig, type AgentRole, modelFor, pricingFor, estimateCostUsd } from './config/models.ts';
export { BUDGET_GUARDRAILS, type BudgetGuardrails } from './config/budget.ts';
export { mergeOverrides, getEffectiveConfig, type EffectiveConfig, type ConfigOverrides, type StoryOverridesProvider } from './config/effective.ts';
```

- [ ] **Step 15.6: Typecheck + commit**

```bash
pnpm --filter @novel/core typecheck
pnpm --filter @novel/core test
git add packages/core/src/config/effective.ts packages/core/src/index.ts packages/core/test/effective-config.test.ts
git commit -m "feat(core): add effective config merger with per-story overrides"
```

---

## Task 16: Pino logger + trace_id helpers

**Files:**
- Create: `packages/core/src/logger.ts`
- Create: `packages/core/src/trace.ts`
- Create: `packages/core/test/trace.test.ts`

- [ ] **Step 16.1: Write `logger.ts`**

```ts
import pino from 'pino';

export const rootLogger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'novel-writer' },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof rootLogger;

export function child(bindings: Record<string, unknown>): Logger {
  return rootLogger.child(bindings);
}
```

- [ ] **Step 16.2: Write `trace.ts`**

```ts
import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TraceContext {
  traceId: string;
}

const storage = new AsyncLocalStorage<TraceContext>();

export function newTraceId(): string {
  return randomUUID();
}

export function withTrace<T>(ctx: TraceContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getTraceId(): string | undefined {
  return storage.getStore()?.traceId;
}
```

- [ ] **Step 16.3: Write test for trace helpers**

`packages/core/test/trace.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { withTrace, getTraceId, newTraceId } from '../src/trace.ts';

describe('trace context', () => {
  it('returns undefined outside withTrace', () => {
    expect(getTraceId()).toBeUndefined();
  });

  it('returns the trace id inside withTrace', () => {
    const id = newTraceId();
    withTrace({ traceId: id }, () => {
      expect(getTraceId()).toBe(id);
    });
  });

  it('isolates traces across siblings', async () => {
    const id1 = newTraceId();
    const id2 = newTraceId();
    const r1 = withTrace({ traceId: id1 }, async () => getTraceId());
    const r2 = withTrace({ traceId: id2 }, async () => getTraceId());
    expect(await r1).toBe(id1);
    expect(await r2).toBe(id2);
  });
});
```

- [ ] **Step 16.4: Run tests + commit**

```bash
pnpm --filter @novel/core test
```

Expected: 7 passing total.

```bash
git add packages/core/src/logger.ts packages/core/src/trace.ts packages/core/test/trace.test.ts
git commit -m "feat(core): add pino logger and AsyncLocalStorage trace context"
```

---

## Task 17: LLM call logger service (writes to `llm_calls`)

**Files:**
- Create: `packages/ai/src/llm-call-logger.ts`
- Create: `packages/ai/test/llm-call-logger.test.ts`

This service wraps any `LLMProvider`, executes the call, and records a row in `llm_calls`. All agents go through this wrapper so we never miss a call.

- [ ] **Step 17.1: Write failing test**

`packages/ai/test/llm-call-logger.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { LoggedLLMProvider } from '../src/llm-call-logger.ts';
import { MockProvider } from '../src/providers/mock.ts';

describe('LoggedLLMProvider', () => {
  it('records a row per call with cost estimate', async () => {
    const recorder = vi.fn();
    const inner = new MockProvider({
      responder: { kind: 'fixed', content: 'ok', usage: { inputTokens: 1000, outputTokens: 500, cachedInputTokens: 800 } },
    });
    const wrapped = new LoggedLLMProvider({ inner, recordCall: recorder });

    await wrapped.complete({
      model: 'google/gemini-2.5-flash-lite',
      messages: [{ role: 'user', content: 'hi' }],
      metadata: { agentRole: 'writer', promptVersion: 'writer.v1', traceId: 'trace-1' },
    });

    expect(recorder).toHaveBeenCalledTimes(1);
    const row = recorder.mock.calls[0][0];
    expect(row.model).toBe('google/gemini-2.5-flash-lite');
    expect(row.agentRole).toBe('writer');
    expect(row.promptVersion).toBe('writer.v1');
    expect(row.inputTokens).toBe(1000);
    expect(row.outputTokens).toBe(500);
    expect(row.cachedInputTokens).toBe(800);
    expect(row.traceId).toBe('trace-1');
    expect(Number(row.estimatedCostUsd)).toBeGreaterThan(0);
  });

  it('still records on inner failure', async () => {
    const recorder = vi.fn();
    const inner = new MockProvider({
      responder: { kind: 'fn', fn: () => { throw new Error('boom'); } },
    });
    const wrapped = new LoggedLLMProvider({ inner, recordCall: recorder });

    await expect(wrapped.complete({
      model: 'google/gemini-2.5-flash-lite',
      messages: [{ role: 'user', content: 'hi' }],
      metadata: { agentRole: 'writer', traceId: 't' },
    })).rejects.toThrow('boom');

    expect(recorder).toHaveBeenCalledTimes(1);
    const row = recorder.mock.calls[0][0];
    expect(row.inputTokens).toBe(0);
    expect(row.outputTokens).toBe(0);
  });
});
```

Run:
```bash
pnpm --filter @novel/ai test
```
Expected: FAIL — `LoggedLLMProvider not exported`.

- [ ] **Step 17.2: Implement**

`packages/ai/src/llm-call-logger.ts`:

```ts
import { estimateCostUsd } from '@novel/core';
import type { CompletionRequest, CompletionResponse, LLMProvider } from './providers/types.ts';

export interface LlmCallRecord {
  storyId?: string;
  chapterId?: string;
  agentRole: string;
  model: string;
  promptVersion?: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  estimatedCostUsd: string;   // numeric column → string for precision
  traceId?: string;
}

export interface LoggedLLMProviderOptions {
  inner: LLMProvider;
  recordCall: (row: LlmCallRecord) => Promise<void> | void;
}

export class LoggedLLMProvider implements LLMProvider {
  readonly name: string;
  constructor(private opts: LoggedLLMProviderOptions) {
    this.name = `logged(${opts.inner.name})`;
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const meta = req.metadata ?? {};
    let res: CompletionResponse | undefined;
    let error: unknown;
    try {
      res = await this.opts.inner.complete(req);
      return res;
    } catch (e) {
      error = e;
      throw e;
    } finally {
      const usage = res?.usage ?? { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
      const cost = estimateCostUsd(req.model, usage);
      const row: LlmCallRecord = {
        agentRole: meta.agentRole ?? 'unknown',
        model: req.model,
        promptVersion: meta.promptVersion,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedInputTokens: usage.cachedInputTokens,
        estimatedCostUsd: cost.toFixed(6),
        traceId: meta.traceId,
        storyId: (meta as Record<string, string | undefined>).storyId,
        chapterId: (meta as Record<string, string | undefined>).chapterId,
      };
      try {
        await this.opts.recordCall(row);
      } catch (logErr) {
        // never swallow original error; log this separately
        // eslint-disable-next-line no-console
        console.error('llm_call_logger: failed to record', logErr);
      }
      // suppress unused-var lint
      void error;
    }
  }
}
```

- [ ] **Step 17.3: Add Drizzle-backed recorder helper**

Append:

```ts
import { llmCalls, type NewLlmCall } from '@novel/db/schema';
import type { Db } from '@novel/db';

export function makeDrizzleRecorder(db: Db): (row: LlmCallRecord) => Promise<void> {
  return async (row: LlmCallRecord) => {
    const insert: NewLlmCall = {
      agentRole: row.agentRole,
      model: row.model,
      promptVersion: row.promptVersion ?? null,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      cachedInputTokens: row.cachedInputTokens,
      estimatedCostUsd: row.estimatedCostUsd,
      traceId: row.traceId ?? null,
      storyId: row.storyId ?? null,
      chapterId: row.chapterId ?? null,
    };
    await db.insert(llmCalls).values(insert);
  };
}
```

- [ ] **Step 17.4: Run tests + commit**

```bash
pnpm --filter @novel/ai test
```

Expected: 8 passing (2 new + 6 existing).

```bash
git add packages/ai/src/llm-call-logger.ts packages/ai/test/llm-call-logger.test.ts
git commit -m "feat(ai): add LoggedLLMProvider that records every call to llm_calls"
```

---

## Task 18: Bible Generator Zod schema

**Files:**
- Create: `packages/ai/src/schemas/bible.ts`
- Create: `packages/ai/test/schemas/bible.test.ts`

- [ ] **Step 18.1: Write failing test**

`packages/ai/test/schemas/bible.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { BibleSchema, bibleJsonSchema } from '../../src/schemas/bible.ts';

describe('BibleSchema', () => {
  it('parses a complete bible', () => {
    const r = BibleSchema.parse({
      world_rules: 'r',
      cultivation_system: 'c',
      bloodline_system: 'b',
      style_guide: 's',
      forbidden_rules: 'f',
      ending_direction: 'e',
      compact_summary: 'cs',
    });
    expect(r.world_rules).toBe('r');
  });

  it('rejects missing required fields', () => {
    expect(() => BibleSchema.parse({})).toThrow();
  });

  it('exposes a JSON Schema for structured output', () => {
    expect(bibleJsonSchema.type).toBe('object');
    expect(bibleJsonSchema.required).toContain('world_rules');
    expect(bibleJsonSchema.required).toContain('forbidden_rules');
  });
});
```

- [ ] **Step 18.2: Implement**

`packages/ai/src/schemas/bible.ts`:

```ts
import { z } from 'zod';
import type { JsonSchema } from '../providers/types.ts';

export const BibleSchema = z.object({
  world_rules: z.string().min(50),
  cultivation_system: z.string().min(50),
  bloodline_system: z.string().min(50),
  style_guide: z.string().min(50),
  forbidden_rules: z.string().min(20),
  ending_direction: z.string().min(20),
  compact_summary: z.string().min(50).max(2000),
});

export type Bible = z.infer<typeof BibleSchema>;

export const bibleJsonSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'world_rules',
    'cultivation_system',
    'bloodline_system',
    'style_guide',
    'forbidden_rules',
    'ending_direction',
    'compact_summary',
  ],
  properties: {
    world_rules: { type: 'string' },
    cultivation_system: { type: 'string' },
    bloodline_system: { type: 'string' },
    style_guide: { type: 'string' },
    forbidden_rules: { type: 'string' },
    ending_direction: { type: 'string' },
    compact_summary: { type: 'string' },
  },
};
```

- [ ] **Step 18.3: Run tests + commit**

```bash
pnpm --filter @novel/ai test
```

Expected: 11 passing.

```bash
git add packages/ai/src/schemas packages/ai/test/schemas
git commit -m "feat(ai): add Bible schema (Zod + JSON Schema for structured output)"
```

---

## Task 19: Prompt registry + Bible generator prompt v1

**Files:**
- Create: `packages/ai/src/prompts/registry.ts`
- Create: `packages/ai/src/prompts/bible-generator.v1.ts`

- [ ] **Step 19.1: Write `registry.ts`**

```ts
export interface PromptTemplate {
  agentRole: string;
  version: string;
  render(input: Record<string, unknown>): string;
}

const _registry = new Map<string, PromptTemplate>();

export function registerPrompt(p: PromptTemplate): void {
  _registry.set(`${p.agentRole}@${p.version}`, p);
}

export function getPrompt(agentRole: string, version: string): PromptTemplate {
  const k = `${agentRole}@${version}`;
  const p = _registry.get(k);
  if (!p) throw new Error(`Prompt not registered: ${k}`);
  return p;
}

export function listPrompts(): PromptTemplate[] {
  return Array.from(_registry.values());
}
```

- [ ] **Step 19.2: Write `bible-generator.v1.ts`**

```ts
import { registerPrompt, type PromptTemplate } from './registry.ts';

export interface BibleGeneratorInput {
  premise: string;
  genre: string;
  tone: string | null;
  target_chapter_count: number;
}

const TEMPLATE = (i: BibleGeneratorInput): string => `Bạn là một editor / world-builder cho tiểu thuyết tiên hiệp / huyền huyễn dài kỳ.

Nhiệm vụ: tạo Story Bible cho một truyện mới. Đây là tài liệu nền — sẽ KHÔNG bao giờ được phép thay đổi sau khi đã chốt. Mọi chương sau này phải tuân theo.

Premise (ý tưởng người dùng):
${i.premise}

Genre: ${i.genre}
Tone: ${i.tone ?? '(không chỉ định, do bạn đề xuất)'}
Mục tiêu độ dài: ${i.target_chapter_count} chương

Yêu cầu output: JSON tuân theo schema bắt buộc, mỗi field là tiếng Việt:

- world_rules: luật thế giới, cảnh giới, không gian, lịch sử nền (≥ 200 từ)
- cultivation_system: hệ thống tu luyện chi tiết — cảnh giới, cách đột phá, vật phẩm, hạn chế (≥ 200 từ)
- bloodline_system: hệ thống huyết mạch — phân loại, nguồn gốc, cách kế thừa (≥ 150 từ)
- style_guide: phong cách viết (POV, thì, mật độ tâm lý, từ vựng nên/không nên dùng) (≥ 100 từ)
- forbidden_rules: những gì TUYỆT ĐỐI không được phép xảy ra (≥ 5 quy tắc rõ ràng)
- ending_direction: định hướng kết truyện (không cần spoiler, chỉ đại ý) (≥ 50 từ)
- compact_summary: bản tóm tắt cô đọng cho hệ thống cache (≤ 1500 từ)

Ràng buộc:
- Tránh cliché "ding! hệ thống nâng cấp"
- Tránh harem mặc định
- Power phải có cost / risk / limitation
- Phong cách "show, don't tell" cinematic
- Giữ tính nhất quán nội bộ — không có rules mâu thuẫn

Trả lời JSON thuần, không markdown, không giải thích thêm.`;

export const bibleGeneratorPromptV1: PromptTemplate = {
  agentRole: 'bible_generator',
  version: 'v1',
  render: (input) => TEMPLATE(input as unknown as BibleGeneratorInput),
};

registerPrompt(bibleGeneratorPromptV1);
```

- [ ] **Step 19.3: Typecheck + commit**

```bash
pnpm --filter @novel/ai typecheck
git add packages/ai/src/prompts
git commit -m "feat(ai): add prompt registry and bible_generator v1 (Vietnamese)"
```

---

## Task 20: Bible Generator agent

**Files:**
- Create: `packages/ai/src/agents/bible-generator.ts`
- Create: `packages/ai/test/agents/bible-generator.test.ts`

- [ ] **Step 20.1: Write failing test (with mocked provider)**

`packages/ai/test/agents/bible-generator.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { generateBible } from '../../src/agents/bible-generator.ts';
import { MockProvider } from '../../src/providers/mock.ts';
import { LoggedLLMProvider } from '../../src/llm-call-logger.ts';
import '../../src/prompts/bible-generator.v1.ts';

const VALID_BIBLE_JSON = JSON.stringify({
  world_rules: 'A'.repeat(200),
  cultivation_system: 'B'.repeat(200),
  bloodline_system: 'C'.repeat(200),
  style_guide: 'D'.repeat(120),
  forbidden_rules: 'E'.repeat(40),
  ending_direction: 'F'.repeat(60),
  compact_summary: 'G'.repeat(120),
});

describe('generateBible', () => {
  it('returns parsed bible from provider', async () => {
    const recorder = vi.fn();
    const inner = new MockProvider({ responder: { kind: 'fixed', content: VALID_BIBLE_JSON } });
    const provider = new LoggedLLMProvider({ inner, recordCall: recorder });

    const r = await generateBible({
      provider,
      model: 'google/gemini-2.5-pro',
      input: { premise: 'A premise', genre: 'xianxia', tone: 'dark', target_chapter_count: 1000 },
      traceId: 'trace-x',
    });

    expect(r.bible.world_rules).toMatch(/^A+$/);
    expect(r.usage.inputTokens).toBeGreaterThan(0);
    expect(recorder).toHaveBeenCalledTimes(1);
    expect(recorder.mock.calls[0][0].agentRole).toBe('bible_generator');
    expect(recorder.mock.calls[0][0].promptVersion).toBe('v1');
  });

  it('throws ZodError on invalid JSON', async () => {
    const recorder = vi.fn();
    const inner = new MockProvider({ responder: { kind: 'fixed', content: '{"world_rules":"too short"}' } });
    const provider = new LoggedLLMProvider({ inner, recordCall: recorder });

    await expect(generateBible({
      provider,
      model: 'google/gemini-2.5-pro',
      input: { premise: 'p', genre: 'g', tone: null, target_chapter_count: 100 },
      traceId: 't',
    })).rejects.toThrow();
    expect(recorder).toHaveBeenCalledTimes(1);
  });
});
```

Run:
```bash
pnpm --filter @novel/ai test
```
Expected: FAIL — `generateBible not exported`.

- [ ] **Step 20.2: Implement**

`packages/ai/src/agents/bible-generator.ts`:

```ts
import type { LLMProvider } from '../providers/types.ts';
import { BibleSchema, bibleJsonSchema, type Bible } from '../schemas/bible.ts';
import { getPrompt } from '../prompts/registry.ts';
import type { BibleGeneratorInput } from '../prompts/bible-generator.v1.ts';

export interface GenerateBibleParams {
  provider: LLMProvider;
  model: string;
  input: BibleGeneratorInput;
  traceId?: string;
  storyId?: string;
}

export interface GenerateBibleResult {
  bible: Bible;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number };
  rawContent: string;
}

export async function generateBible(params: GenerateBibleParams): Promise<GenerateBibleResult> {
  const tmpl = getPrompt('bible_generator', 'v1');
  const userContent = tmpl.render(params.input as unknown as Record<string, unknown>);

  const res = await params.provider.complete({
    model: params.model,
    messages: [{ role: 'user', content: userContent }],
    responseSchema: bibleJsonSchema,
    temperature: 0.7,
    metadata: {
      agentRole: tmpl.agentRole,
      promptVersion: tmpl.version,
      traceId: params.traceId,
      ...(params.storyId ? { storyId: params.storyId } : {}),
    },
  });

  const parsed = BibleSchema.parse(JSON.parse(res.content));
  return { bible: parsed, usage: res.usage, rawContent: res.content };
}
```

- [ ] **Step 20.3: Re-run tests**

```bash
pnpm --filter @novel/ai test
```
Expected: 13 passing total.

- [ ] **Step 20.4: Commit**

```bash
git add packages/ai/src/agents packages/ai/test/agents
git commit -m "feat(ai): implement bible_generator agent with structured output"
```

---

## Task 21: Fastify API skeleton + health route

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/plugins/logger.ts`
- Create: `apps/api/src/plugins/error-handler.ts`
- Create: `apps/api/src/routes/health.ts`
- Create: `apps/api/test/health.test.ts`

- [ ] **Step 21.1: Write `apps/api/package.json`**

```json
{
  "name": "@novel/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@novel/core": "workspace:*",
    "@novel/db": "workspace:*",
    "@novel/ai": "workspace:*",
    "fastify": "5.4.0",
    "zod": "3.25.76"
  },
  "devDependencies": {
    "typescript": "5.9.3",
    "tsx": "4.21.0",
    "vitest": "3.3.0",
    "@types/node": "24.12.2"
  }
}
```

- [ ] **Step 21.2: Write `apps/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*", "test/**/*"]
}
```

- [ ] **Step 21.3: Write `plugins/logger.ts`**

```ts
import type { FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';
import { rootLogger } from '@novel/core/logger';
import { newTraceId, withTrace } from '@novel/core/trace';

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  app.addHook('onRequest', (req, _reply, hookDone) => {
    const traceId = (req.headers['x-trace-id'] as string | undefined) ?? newTraceId();
    (req as unknown as { traceId: string }).traceId = traceId;
    withTrace({ traceId }, () => {
      req.log = rootLogger.child({ traceId, method: req.method, url: req.url });
      hookDone();
    });
  });
  done();
};

export default fp(plugin, { name: 'logger' });
```

Note: requires `fastify-plugin`. Add to deps:

```bash
pnpm --filter @novel/api add fastify-plugin@5.0.1
```

- [ ] **Step 21.4: Write `plugins/error-handler.ts`**

```ts
import type { FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      req.log.warn({ issues: err.issues }, 'validation error');
      return reply.status(400).send({ error: 'validation_error', issues: err.issues });
    }
    req.log.error({ err }, 'unhandled error');
    return reply.status(500).send({ error: 'internal_error', message: err.message });
  });
  done();
};

export default fp(plugin, { name: 'error-handler' });
```

- [ ] **Step 21.5: Write `routes/health.ts`**

```ts
import type { FastifyPluginCallback } from 'fastify';

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));
  done();
};

export default plugin;
```

- [ ] **Step 21.6: Write `server.ts`**

```ts
import Fastify from 'fastify';
import logger from './plugins/logger.ts';
import errorHandler from './plugins/error-handler.ts';
import healthRoute from './routes/health.ts';

export function buildServer() {
  const app = Fastify({ logger: false });
  app.register(logger);
  app.register(errorHandler);
  app.register(healthRoute);
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = buildServer();
  const port = Number(process.env.API_PORT ?? 4000);
  app.listen({ port, host: '0.0.0.0' }).then(() => {
    // eslint-disable-next-line no-console
    console.log(`api listening on :${port}`);
  });
}
```

- [ ] **Step 21.7: Write health test**

`apps/api/test/health.test.ts`:

```ts
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { buildServer } from '../src/server.ts';

const app = buildServer();
beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });

describe('GET /health', () => {
  it('returns ok', async () => {
    const r = await app.inject({ method: 'GET', url: '/health' });
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.body).status).toBe('ok');
  });
});
```

- [ ] **Step 21.8: Install + run tests**

```bash
pnpm install
pnpm --filter @novel/api test
```

Expected: 1 passing.

- [ ] **Step 21.9: Commit**

```bash
git add apps/api
git commit -m "feat(api): scaffold Fastify server with logger, error handler, health"
```

---

## Task 22: POST `/api/stories` and GET `/api/stories`

**Files:**
- Create: `apps/api/src/routes/stories.ts`
- Modify: `apps/api/src/server.ts`
- Create: `apps/api/test/stories.test.ts`

- [ ] **Step 22.1: Write failing test**

`apps/api/test/stories.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server.ts';

const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://novel:novel@localhost:5432/novel_factory';
process.env.DATABASE_URL = TEST_DB;

const app = buildServer();
beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });

describe('stories routes', () => {
  it('creates and lists stories', async () => {
    const create = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 'T', premise: 'P', genre: 'xianxia_fantasy', targetChapterCount: 100 },
    });
    expect(create.statusCode).toBe(201);
    const created = JSON.parse(create.body);
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);

    const list = await app.inject({ method: 'GET', url: '/api/stories' });
    expect(list.statusCode).toBe(200);
    const stories = JSON.parse(list.body);
    expect(stories.find((s: { id: string }) => s.id === created.id)).toBeDefined();

    const one = await app.inject({ method: 'GET', url: `/api/stories/${created.id}` });
    expect(one.statusCode).toBe(200);
    expect(JSON.parse(one.body).title).toBe('T');
  });

  it('rejects missing premise with 400', async () => {
    const r = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 'X' },
    });
    expect(r.statusCode).toBe(400);
  });
});
```

- [ ] **Step 22.2: Implement route**

`apps/api/src/routes/stories.ts`:

```ts
import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { stories } from '@novel/db/schema';
import { eq, desc } from 'drizzle-orm';

const CreateStorySchema = z.object({
  title: z.string().min(1).max(200),
  premise: z.string().min(20).max(5000),
  genre: z.string().default('xianxia_fantasy'),
  tone: z.string().nullish(),
  targetChapterCount: z.number().int().min(1).max(10000).default(1000),
});

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  const db = getDb();

  app.post('/api/stories', async (req, reply) => {
    const body = CreateStorySchema.parse(req.body);
    const [row] = await db.insert(stories).values({
      title: body.title,
      premise: body.premise,
      genre: body.genre,
      tone: body.tone ?? null,
      targetChapterCount: body.targetChapterCount,
    }).returning();
    return reply.status(201).send(row);
  });

  app.get('/api/stories', async () => {
    return db.select().from(stories).orderBy(desc(stories.createdAt)).limit(100);
  });

  app.get<{ Params: { id: string } }>('/api/stories/:id', async (req, reply) => {
    const id = z.string().uuid().parse(req.params.id);
    const [row] = await db.select().from(stories).where(eq(stories.id, id));
    if (!row) return reply.status(404).send({ error: 'not_found' });
    return row;
  });

  done();
};

export default plugin;
```

- [ ] **Step 22.3: Register in `server.ts`**

Add `import storiesRoute from './routes/stories.ts';` and `app.register(storiesRoute);` after the health route line.

- [ ] **Step 22.4: Run tests**

```bash
TEST_DATABASE_URL=postgresql://novel:novel@localhost:5432/novel_factory pnpm --filter @novel/api test
```

Expected: 3 passing.

- [ ] **Step 22.5: Commit**

```bash
git add apps/api/src/routes/stories.ts apps/api/src/server.ts apps/api/test/stories.test.ts
git commit -m "feat(api): add POST/GET /api/stories with Zod validation"
```

---

## Task 23: Provider factory (helper to construct LoggedLLMProvider with proper recorder)

**Files:**
- Create: `apps/api/src/lib/llm-provider.ts`

- [ ] **Step 23.1: Write factory**

```ts
import { OpenRouterProvider } from '@novel/ai/providers/openrouter';
import { MockProvider } from '@novel/ai/providers/mock';
import { LoggedLLMProvider, makeDrizzleRecorder } from '@novel/ai/llm-call-logger';
import type { LLMProvider } from '@novel/ai/providers/types';
import { getDb } from '@novel/db';

export function buildLoggedProvider(opts?: { mockResponse?: string }): LLMProvider {
  const inner: LLMProvider = opts?.mockResponse
    ? new MockProvider({ responder: { kind: 'fixed', content: opts.mockResponse } })
    : new OpenRouterProvider({
        apiKey: requireEnv('OPENROUTER_API_KEY'),
        baseUrl: process.env.OPENROUTER_BASE_URL,
        httpReferer: process.env.OPENROUTER_HTTP_REFERER,
        xTitle: process.env.OPENROUTER_X_TITLE,
      });
  const recorder = makeDrizzleRecorder(getDb());
  return new LoggedLLMProvider({ inner, recordCall: recorder });
}

function requireEnv(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`${k} is required`);
  return v;
}
```

- [ ] **Step 23.2: Commit**

```bash
git add apps/api/src/lib/llm-provider.ts
git commit -m "feat(api): add buildLoggedProvider factory"
```

---

## Task 24: POST `/api/stories/:id/bible` (triggers Bible Generator)

**Files:**
- Create: `apps/api/src/routes/bible.ts`
- Modify: `apps/api/src/server.ts`
- Create: `apps/api/test/bible.test.ts`

⚠️ **API GATE**: this is the first endpoint that can trigger a real LLM call. Tests use mock; production calls use OpenRouter.

- [ ] **Step 24.1: Write failing test**

`apps/api/test/bible.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server.ts';

const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://novel:novel@localhost:5432/novel_factory';
process.env.DATABASE_URL = TEST_DB;
process.env.OPENROUTER_API_KEY = 'test-key';
process.env.NOVEL_FORCE_MOCK_LLM = '1';

const VALID_BIBLE = JSON.stringify({
  world_rules: 'A'.repeat(200),
  cultivation_system: 'B'.repeat(200),
  bloodline_system: 'C'.repeat(200),
  style_guide: 'D'.repeat(120),
  forbidden_rules: 'E'.repeat(40),
  ending_direction: 'F'.repeat(60),
  compact_summary: 'G'.repeat(120),
});
process.env.NOVEL_MOCK_LLM_RESPONSE = VALID_BIBLE;

const app = buildServer();
beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });

describe('bible routes', () => {
  it('generates and persists bible for a story', async () => {
    const created = await app.inject({
      method: 'POST', url: '/api/stories',
      payload: { title: 'BibleTest', premise: 'A'.repeat(50) },
    });
    const story = JSON.parse(created.body);

    const gen = await app.inject({ method: 'POST', url: `/api/stories/${story.id}/bible` });
    expect(gen.statusCode).toBe(201);
    const bible = JSON.parse(gen.body);
    expect(bible.worldRules).toMatch(/^A+$/);

    const fetched = await app.inject({ method: 'GET', url: `/api/stories/${story.id}/bible` });
    expect(fetched.statusCode).toBe(200);
    expect(JSON.parse(fetched.body).id).toBe(bible.id);
  });
});
```

- [ ] **Step 24.2: Update `buildLoggedProvider` to honor `NOVEL_FORCE_MOCK_LLM`**

Modify `apps/api/src/lib/llm-provider.ts`:

```ts
export function buildLoggedProvider(opts?: { mockResponse?: string }): LLMProvider {
  const forceMock = process.env.NOVEL_FORCE_MOCK_LLM === '1';
  const mockResponse = opts?.mockResponse ?? process.env.NOVEL_MOCK_LLM_RESPONSE;
  const inner: LLMProvider = (forceMock || opts?.mockResponse)
    ? new MockProvider({ responder: { kind: 'fixed', content: mockResponse ?? '{}' } })
    : new OpenRouterProvider({
        apiKey: requireEnv('OPENROUTER_API_KEY'),
        baseUrl: process.env.OPENROUTER_BASE_URL,
        httpReferer: process.env.OPENROUTER_HTTP_REFERER,
        xTitle: process.env.OPENROUTER_X_TITLE,
      });
  const recorder = makeDrizzleRecorder(getDb());
  return new LoggedLLMProvider({ inner, recordCall: recorder });
}
```

- [ ] **Step 24.3: Implement bible route**

`apps/api/src/routes/bible.ts`:

```ts
import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';
import { getDb } from '@novel/db';
import { stories, storyBibles } from '@novel/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateBible } from '@novel/ai/agents/bible-generator';
import '@novel/ai/prompts/bible-generator.v1';
import { modelFor } from '@novel/core';
import { buildLoggedProvider } from '../lib/llm-provider.ts';
import { newTraceId } from '@novel/core/trace';

const plugin: FastifyPluginCallback = (app, _opts, done) => {
  const db = getDb();

  app.post<{ Params: { id: string } }>('/api/stories/:id/bible', async (req, reply) => {
    const id = z.string().uuid().parse(req.params.id);
    const [story] = await db.select().from(stories).where(eq(stories.id, id));
    if (!story) return reply.status(404).send({ error: 'story_not_found' });

    const provider = buildLoggedProvider();
    const traceId = (req as unknown as { traceId: string }).traceId ?? newTraceId();

    const { bible } = await generateBible({
      provider,
      model: modelFor('bible_generator'),
      input: {
        premise: story.premise,
        genre: story.genre,
        tone: story.tone ?? null,
        target_chapter_count: story.targetChapterCount,
      },
      traceId,
      storyId: story.id,
    });

    const [row] = await db.insert(storyBibles).values({
      storyId: story.id,
      worldRules: bible.world_rules,
      cultivationSystem: bible.cultivation_system,
      bloodlineSystem: bible.bloodline_system,
      styleGuide: bible.style_guide,
      forbiddenRules: bible.forbidden_rules,
      endingDirection: bible.ending_direction,
      compactSummary: bible.compact_summary,
    }).returning();

    return reply.status(201).send(row);
  });

  app.get<{ Params: { id: string } }>('/api/stories/:id/bible', async (req, reply) => {
    const id = z.string().uuid().parse(req.params.id);
    const [row] = await db.select()
      .from(storyBibles)
      .where(eq(storyBibles.storyId, id))
      .orderBy(desc(storyBibles.version))
      .limit(1);
    if (!row) return reply.status(404).send({ error: 'bible_not_found' });
    return row;
  });

  done();
};

export default plugin;
```

- [ ] **Step 24.4: Register route in server**

Add `import bibleRoute from './routes/bible.ts';` and `app.register(bibleRoute);`.

- [ ] **Step 24.5: Run tests**

```bash
TEST_DATABASE_URL=postgresql://novel:novel@localhost:5432/novel_factory pnpm --filter @novel/api test
```

Expected: 4 passing.

- [ ] **Step 24.6: Commit**

```bash
git add apps/api/src/routes/bible.ts apps/api/src/server.ts apps/api/src/lib/llm-provider.ts apps/api/test/bible.test.ts
git commit -m "feat(api): add bible generation/fetch endpoints (mocked in tests)"
```

---

## Task 25: PUT `/api/stories/:id/bible` (manual edit, bumps version)

**Files:**
- Modify: `apps/api/src/routes/bible.ts`
- Modify: `apps/api/test/bible.test.ts`

- [ ] **Step 25.1: Write failing test (append to `bible.test.ts`)**

```ts
it('PUT updates bible and bumps version', async () => {
  const created = await app.inject({
    method: 'POST', url: '/api/stories',
    payload: { title: 'EditTest', premise: 'A'.repeat(50) },
  });
  const story = JSON.parse(created.body);
  await app.inject({ method: 'POST', url: `/api/stories/${story.id}/bible` });

  const upd = await app.inject({
    method: 'PUT', url: `/api/stories/${story.id}/bible`,
    payload: { worldRules: 'EDITED'.repeat(20), styleGuide: 'edited'.repeat(20) },
  });
  expect(upd.statusCode).toBe(200);
  const updated = JSON.parse(upd.body);
  expect(updated.version).toBe(2);
  expect(updated.worldRules).toMatch(/^(EDITED)+$/);
});
```

- [ ] **Step 25.2: Implement PUT handler**

Add to `apps/api/src/routes/bible.ts` before `done()`:

```ts
const UpdateBibleSchema = z.object({
  worldRules: z.string().min(50).optional(),
  cultivationSystem: z.string().min(50).optional(),
  bloodlineSystem: z.string().min(50).optional(),
  styleGuide: z.string().min(50).optional(),
  forbiddenRules: z.string().min(20).optional(),
  endingDirection: z.string().min(20).optional(),
  compactSummary: z.string().min(50).max(2000).optional(),
  styleFewShots: z.array(z.string()).optional(),
});

app.put<{ Params: { id: string } }>('/api/stories/:id/bible', async (req, reply) => {
  const id = z.string().uuid().parse(req.params.id);
  const patch = UpdateBibleSchema.parse(req.body);
  const [current] = await db.select().from(storyBibles)
    .where(eq(storyBibles.storyId, id))
    .orderBy(desc(storyBibles.version))
    .limit(1);
  if (!current) return reply.status(404).send({ error: 'bible_not_found' });

  const [next] = await db.insert(storyBibles).values({
    storyId: id,
    version: current.version + 1,
    worldRules: patch.worldRules ?? current.worldRules,
    cultivationSystem: patch.cultivationSystem ?? current.cultivationSystem,
    bloodlineSystem: patch.bloodlineSystem ?? current.bloodlineSystem,
    styleGuide: patch.styleGuide ?? current.styleGuide,
    forbiddenRules: patch.forbiddenRules ?? current.forbiddenRules,
    endingDirection: patch.endingDirection ?? current.endingDirection,
    compactSummary: patch.compactSummary ?? current.compactSummary,
    styleFewShots: patch.styleFewShots ?? current.styleFewShots,
  }).returning();
  return next;
});
```

- [ ] **Step 25.3: Run tests + commit**

```bash
TEST_DATABASE_URL=postgresql://novel:novel@localhost:5432/novel_factory pnpm --filter @novel/api test
```
Expected: 5 passing.

```bash
git add apps/api/src/routes/bible.ts apps/api/test/bible.test.ts
git commit -m "feat(api): add PUT /api/stories/:id/bible (creates new versioned row)"
```

---

## Task 26: Live LLM smoke harness (gated by user)

**Files:**
- Create: `apps/api/scripts/smoke-bible.ts`

This is **manually invoked**, never automatic. It exists so the user can run a real OpenRouter call once env is configured.

- [ ] **Step 26.1: Write script**

`apps/api/scripts/smoke-bible.ts`:

```ts
/**
 * Live LLM smoke test for bible generation.
 *
 * USAGE:
 *   pnpm --filter @novel/api tsx scripts/smoke-bible.ts <storyId>
 *
 * Reads OPENROUTER_API_KEY and DATABASE_URL from env.
 * This script will spend real credits. Run only when you intend to.
 */
import { generateBible } from '@novel/ai/agents/bible-generator';
import '@novel/ai/prompts/bible-generator.v1';
import { OpenRouterProvider } from '@novel/ai/providers/openrouter';
import { LoggedLLMProvider, makeDrizzleRecorder } from '@novel/ai/llm-call-logger';
import { getDb } from '@novel/db';
import { stories } from '@novel/db/schema';
import { eq } from 'drizzle-orm';
import { modelFor } from '@novel/core';

const storyId = process.argv[2];
if (!storyId) {
  console.error('Usage: tsx scripts/smoke-bible.ts <storyId>');
  process.exit(1);
}
if (!process.env.OPENROUTER_API_KEY) {
  console.error('OPENROUTER_API_KEY not set');
  process.exit(1);
}

const db = getDb();
const [story] = await db.select().from(stories).where(eq(stories.id, storyId));
if (!story) { console.error('story not found'); process.exit(1); }

const provider = new LoggedLLMProvider({
  inner: new OpenRouterProvider({
    apiKey: process.env.OPENROUTER_API_KEY!,
    httpReferer: process.env.OPENROUTER_HTTP_REFERER,
    xTitle: process.env.OPENROUTER_X_TITLE,
  }),
  recordCall: makeDrizzleRecorder(db),
});

console.log(`generating bible for ${story.title} using ${modelFor('bible_generator')}...`);
const result = await generateBible({
  provider,
  model: modelFor('bible_generator'),
  input: {
    premise: story.premise,
    genre: story.genre,
    tone: story.tone ?? null,
    target_chapter_count: story.targetChapterCount,
  },
  storyId: story.id,
});
console.log('OK. Tokens:', result.usage);
console.log('--- compact_summary preview ---');
console.log(result.bible.compact_summary.slice(0, 200) + '...');
process.exit(0);
```

- [ ] **Step 26.2: Commit (do NOT run)**

```bash
git add apps/api/scripts/smoke-bible.ts
git commit -m "chore(api): add manual live-LLM bible smoke script (gated, not auto-run)"
```

⚠️ **Do not run this script during plan execution.** It costs real money. The user runs it themselves when ready.

---

## Task 27: Next.js scaffold for `apps/web`

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/lib/api-client.ts`

- [ ] **Step 27.1: Write `apps/web/package.json`**

```json
{
  "name": "@novel/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "typecheck": "tsc --noEmit",
    "test": "echo 'web has no unit tests in plan 1'"
  },
  "dependencies": {
    "next": "15.1.7",
    "react": "19.0.0",
    "react-dom": "19.0.0"
  },
  "devDependencies": {
    "@types/node": "24.12.2",
    "@types/react": "19.0.7",
    "@types/react-dom": "19.0.3",
    "typescript": "5.9.3"
  }
}
```

- [ ] **Step 27.2: Write `apps/web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["dom", "dom.iterable", "ES2023"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 27.3: Write `apps/web/next.config.ts`**

```ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  experimental: { typedRoutes: true },
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000',
  },
};

export default config;
```

- [ ] **Step 27.4: Write `apps/web/app/layout.tsx`**

```tsx
import './globals.css';
import type { ReactNode } from 'react';

export const metadata = { title: 'Novel Writer', description: 'AI Novel Factory' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <header style={{ padding: 16, borderBottom: '1px solid #ddd' }}>
          <a href="/" style={{ textDecoration: 'none', color: 'inherit', fontWeight: 600 }}>
            Novel Writer
          </a>
        </header>
        <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 27.5: Write `apps/web/app/globals.css`**

```css
* { box-sizing: border-box; }
body { color: #1a1a1a; background: #fafafa; }
button { padding: 8px 14px; border-radius: 6px; border: 1px solid #888; cursor: pointer; background: #fff; }
button:hover { background: #f0f0f0; }
button.primary { background: #1a4ed8; color: white; border-color: #1a4ed8; }
button.primary:hover { background: #143fa6; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
input, textarea, select { padding: 8px 10px; border-radius: 6px; border: 1px solid #ccc; width: 100%; font: inherit; }
label { display: block; font-weight: 600; margin-bottom: 4px; margin-top: 12px; }
.error { color: #b91c1c; }
.muted { color: #666; }
.card { background: white; border: 1px solid #e5e5e5; padding: 16px; border-radius: 8px; }
```

- [ ] **Step 27.6: Write `apps/web/lib/api-client.ts`**

```ts
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`API ${r.status}: ${text}`);
  }
  return r.json() as Promise<T>;
}
```

- [ ] **Step 27.7: Write placeholder home `apps/web/app/page.tsx`**

```tsx
import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <h1>Stories</h1>
      <p><Link href="/stories/new">+ New Story</Link></p>
      <p className="muted">Stories list will appear here (Task 28).</p>
    </div>
  );
}
```

- [ ] **Step 27.8: Install + typecheck + commit**

```bash
pnpm install
pnpm --filter @novel/web typecheck
git add apps/web
git commit -m "feat(web): scaffold Next.js 15 App Router with layout and api-client"
```

---

## Task 28: Stories list + create form UI

**Files:**
- Modify: `apps/web/app/page.tsx`
- Create: `apps/web/app/stories/new/page.tsx`

- [ ] **Step 28.1: Update home to fetch and list stories**

`apps/web/app/page.tsx`:

```tsx
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';

interface Story {
  id: string;
  title: string;
  premise: string;
  genre: string;
  status: string;
  targetChapterCount: number;
  createdAt: string;
}

export default async function Home() {
  let stories: Story[] = [];
  let error: string | null = null;
  try {
    stories = await apiFetch<Story[]>('/api/stories');
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div>
      <h1>Stories</h1>
      <p><Link href="/stories/new"><button className="primary">+ New Story</button></Link></p>
      {error && <p className="error">Failed to load: {error}</p>}
      <div style={{ display: 'grid', gap: 12 }}>
        {stories.map((s) => (
          <Link key={s.id} href={`/stories/${s.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card">
              <strong>{s.title}</strong> <span className="muted">[{s.status}]</span>
              <div className="muted" style={{ marginTop: 4 }}>{s.premise.slice(0, 140)}...</div>
              <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                {s.genre} · target {s.targetChapterCount} chương
              </div>
            </div>
          </Link>
        ))}
        {stories.length === 0 && !error && <p className="muted">No stories yet.</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 28.2: Write `app/stories/new/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';

export default function NewStoryPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [premise, setPremise] = useState('');
  const [genre, setGenre] = useState('xianxia_fantasy');
  const [tone, setTone] = useState('');
  const [target, setTarget] = useState(1000);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiFetch<{ id: string }>('/api/stories', {
        method: 'POST',
        body: JSON.stringify({ title, premise, genre, tone: tone || null, targetChapterCount: target }),
      });
      router.push(`/stories/${created.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>New Story</h1>
      <form onSubmit={submit} style={{ maxWidth: 700 }}>
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />

        <label>Premise (≥ 20 chars)</label>
        <textarea value={premise} onChange={(e) => setPremise(e.target.value)} rows={6} required minLength={20} />

        <label>Genre</label>
        <input value={genre} onChange={(e) => setGenre(e.target.value)} />

        <label>Tone (optional)</label>
        <input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="vd: dark, slow-burn" />

        <label>Target chapter count</label>
        <input type="number" min={1} value={target} onChange={(e) => setTarget(Number(e.target.value))} />

        {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

        <div style={{ marginTop: 16 }}>
          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Story'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 28.3: Verify build**

```bash
pnpm --filter @novel/web typecheck
```

Expected: clean.

- [ ] **Step 28.4: Commit**

```bash
git add apps/web/app
git commit -m "feat(web): add stories list and create form pages"
```

---

## Task 29: Story detail layout + nav

**Files:**
- Create: `apps/web/app/stories/[id]/layout.tsx`
- Create: `apps/web/app/stories/[id]/page.tsx`

- [ ] **Step 29.1: Write layout with side nav**

`apps/web/app/stories/[id]/layout.tsx`:

```tsx
import Link from 'next/link';
import type { ReactNode } from 'react';
import { apiFetch } from '@/lib/api-client';

interface Story { id: string; title: string }

export default async function StoryLayout({
  children, params,
}: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  let story: Story | null = null;
  try { story = await apiFetch<Story>(`/api/stories/${id}`); } catch {}

  if (!story) return <div className="error">Story not found.</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
      <aside>
        <h3 style={{ marginTop: 0 }}>{story.title}</h3>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Link href={`/stories/${id}`}>Overview</Link>
          <Link href={`/stories/${id}/bible`}>Bible</Link>
        </nav>
        <p style={{ marginTop: 16 }}><Link href="/">← All stories</Link></p>
      </aside>
      <section>{children}</section>
    </div>
  );
}
```

- [ ] **Step 29.2: Write overview page**

`apps/web/app/stories/[id]/page.tsx`:

```tsx
import { apiFetch } from '@/lib/api-client';

interface Story {
  id: string; title: string; premise: string; genre: string;
  tone: string | null; targetChapterCount: number; status: string; createdAt: string;
}

export default async function StoryOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await apiFetch<Story>(`/api/stories/${id}`);
  return (
    <div>
      <h1>{s.title}</h1>
      <p className="muted">Genre: {s.genre} · Tone: {s.tone ?? '—'} · Target: {s.targetChapterCount} chương · Status: {s.status}</p>
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Premise</h3>
        <p style={{ whiteSpace: 'pre-wrap' }}>{s.premise}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 29.3: Typecheck + commit**

```bash
pnpm --filter @novel/web typecheck
git add apps/web/app/stories
git commit -m "feat(web): add story detail layout with nav and overview"
```

---

## Task 30: Bible view + generate + edit page

**Files:**
- Create: `apps/web/app/stories/[id]/bible/page.tsx`
- Create: `apps/web/app/stories/[id]/bible/generate-button.tsx`
- Create: `apps/web/app/stories/[id]/bible/edit-form.tsx`

- [ ] **Step 30.1: Write the page**

`apps/web/app/stories/[id]/bible/page.tsx`:

```tsx
import { apiFetch } from '@/lib/api-client';
import { GenerateButton } from './generate-button.tsx';
import { EditForm } from './edit-form.tsx';

interface Bible {
  id: string;
  storyId: string;
  version: number;
  worldRules: string;
  cultivationSystem: string;
  bloodlineSystem: string;
  styleGuide: string;
  forbiddenRules: string;
  endingDirection: string | null;
  compactSummary: string | null;
}

export default async function BiblePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let bible: Bible | null = null;
  try { bible = await apiFetch<Bible>(`/api/stories/${id}/bible`); } catch {}

  if (!bible) {
    return (
      <div>
        <h1>Bible</h1>
        <p>Chưa có bible. Click bên dưới để generate (sẽ gọi LLM thật và tốn token).</p>
        <GenerateButton storyId={id} />
      </div>
    );
  }

  return (
    <div>
      <h1>Bible <span className="muted">v{bible.version}</span></h1>
      <details style={{ marginBottom: 16 }}>
        <summary>Re-generate (sẽ tạo bible mới — version cũ vẫn được giữ)</summary>
        <div style={{ marginTop: 8 }}><GenerateButton storyId={id} /></div>
      </details>
      <EditForm storyId={id} bible={bible} />
    </div>
  );
}
```

- [ ] **Step 30.2: Write the generate button (client component with confirm)**

`apps/web/app/stories/[id]/bible/generate-button.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';

export function GenerateButton({ storyId }: { storyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    if (!confirm('Generate Bible bây giờ? Việc này sẽ gọi OpenRouter và tốn API credits.')) return;
    setLoading(true);
    setErr(null);
    try {
      await apiFetch(`/api/stories/${storyId}/bible`, { method: 'POST' });
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="primary" onClick={go} disabled={loading}>
        {loading ? 'Đang generate...' : 'Generate Bible'}
      </button>
      {err && <p className="error">{err}</p>}
    </div>
  );
}
```

- [ ] **Step 30.3: Write edit form**

`apps/web/app/stories/[id]/bible/edit-form.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';

interface Bible {
  worldRules: string;
  cultivationSystem: string;
  bloodlineSystem: string;
  styleGuide: string;
  forbiddenRules: string;
  endingDirection: string | null;
  compactSummary: string | null;
}

export function EditForm({ storyId, bible }: { storyId: string; bible: Bible }) {
  const [data, setData] = useState({
    worldRules: bible.worldRules,
    cultivationSystem: bible.cultivationSystem,
    bloodlineSystem: bible.bloodlineSystem,
    styleGuide: bible.styleGuide,
    forbiddenRules: bible.forbiddenRules,
    endingDirection: bible.endingDirection ?? '',
    compactSummary: bible.compactSummary ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  function bind<K extends keyof typeof data>(k: K) {
    return {
      value: data[k],
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setData({ ...data, [k]: e.target.value }),
    };
  }

  async function save() {
    setSaving(true); setErr(null);
    try {
      await apiFetch(`/api/stories/${storyId}/bible`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <label>World Rules</label>
      <textarea rows={6} {...bind('worldRules')} />

      <label>Cultivation System</label>
      <textarea rows={6} {...bind('cultivationSystem')} />

      <label>Bloodline System</label>
      <textarea rows={5} {...bind('bloodlineSystem')} />

      <label>Style Guide</label>
      <textarea rows={4} {...bind('styleGuide')} />

      <label>Forbidden Rules</label>
      <textarea rows={4} {...bind('forbiddenRules')} />

      <label>Ending Direction</label>
      <textarea rows={3} {...bind('endingDirection')} />

      <label>Compact Summary (≤ 1500 từ — dùng cho HOT cache)</label>
      <textarea rows={6} {...bind('compactSummary')} />

      {err && <p className="error">{err}</p>}
      <button className="primary" onClick={save} disabled={saving} style={{ marginTop: 12 }}>
        {saving ? 'Saving...' : 'Save (creates new version)'}
      </button>
    </div>
  );
}
```

- [ ] **Step 30.4: Typecheck + commit**

```bash
pnpm --filter @novel/web typecheck
git add apps/web/app/stories/[id]/bible
git commit -m "feat(web): add bible view, generate, and edit pages"
```

---

## Task 31: Local dev orchestration

**Files:**
- Create: `.env.local.example`
- Modify: root `package.json` (already has `dev` script — verify)
- Create: `README.md` (or modify existing)

- [ ] **Step 31.1: Write `.env.local.example`**

```
# Database
DATABASE_URL=postgresql://novel:novel@localhost:5432/novel_factory

# OpenRouter (only required when running real LLM calls)
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_HTTP_REFERER=http://localhost:3000
OPENROUTER_X_TITLE=AI Novel Factory

# Web
NEXT_PUBLIC_API_BASE=http://localhost:4000

# API
API_PORT=4000

# Optional: force mock LLM in any process (use for offline dev)
# NOVEL_FORCE_MOCK_LLM=1
# NOVEL_MOCK_LLM_RESPONSE='{"world_rules":"...", ... full bible JSON ...}'

# Model overrides (defaults are in packages/core/src/config/models.ts)
# BIBLE_MODEL=google/gemini-2.5-pro
# WRITER_MODEL=google/gemini-2.5-flash-lite
```

- [ ] **Step 31.2: Write README**

`README.md`:

```markdown
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

## Tests

```bash
pnpm test
TEST_DATABASE_URL=postgresql://novel:novel@localhost:5432/novel_factory pnpm --filter @novel/api test
```
```

- [ ] **Step 31.3: Commit**

```bash
git add .env.local.example README.md
git commit -m "chore: add .env.local.example and README"
```

---

## Task 32: End-to-end smoke (mocked LLM)

**Files:**
- None (integration verification)

This task verifies the entire Plan 1 stack works without touching real APIs.

- [ ] **Step 32.1: Ensure Postgres + migrations**

```bash
docker compose -f docker-compose.dev.yml ps
DATABASE_URL=postgresql://novel:novel@localhost:5432/novel_factory pnpm db:migrate
```

- [ ] **Step 32.2: Start API in mock mode**

```bash
NOVEL_FORCE_MOCK_LLM=1 \
NOVEL_MOCK_LLM_RESPONSE='{"world_rules":"'$(printf 'A%.0s' {1..200})'","cultivation_system":"'$(printf 'B%.0s' {1..200})'","bloodline_system":"'$(printf 'C%.0s' {1..200})'","style_guide":"'$(printf 'D%.0s' {1..150})'","forbidden_rules":"'$(printf 'E%.0s' {1..40})'","ending_direction":"'$(printf 'F%.0s' {1..60})'","compact_summary":"'$(printf 'G%.0s' {1..150})'"}' \
DATABASE_URL=postgresql://novel:novel@localhost:5432/novel_factory \
OPENROUTER_API_KEY=mock \
pnpm --filter @novel/api dev &
sleep 3
```

- [ ] **Step 32.3: Start web**

```bash
pnpm --filter @novel/web dev &
sleep 5
```

- [ ] **Step 32.4: Manual verification (browser)**

- Open http://localhost:3000
- Click "+ New Story", fill form, submit
- On story page, click "Bible" → "Generate Bible" → confirm prompt
- Verify bible content appears, version = 1
- Edit bible textarea, click Save → version becomes 2

- [ ] **Step 32.5: Verify llm_calls row was logged**

```bash
docker compose -f docker-compose.dev.yml exec postgres \
  psql -U novel -d novel_factory -c "SELECT agent_role, model, input_tokens, output_tokens, prompt_version FROM llm_calls ORDER BY created_at DESC LIMIT 1;"
```

Expected: row with `agent_role=bible_generator`, `prompt_version=v1`.

- [ ] **Step 32.6: Stop dev servers**

```bash
pkill -f "tsx watch" || true
pkill -f "next dev" || true
```

- [ ] **Step 32.7: Commit anything new (probably nothing)**

```bash
git status   # should be clean
```

---

## Task 33: Plan 1 wrap-up commit

- [ ] **Step 33.1: Run all tests once more**

```bash
TEST_DATABASE_URL=postgresql://novel:novel@localhost:5432/novel_factory pnpm test
```

Expected: all packages pass.

- [ ] **Step 33.2: Final tag**

```bash
git tag plan-1-complete
git log --oneline -20
```

---

## Definition of Done — Plan 1 Checklist

- [ ] `pnpm install` succeeds from a clean checkout
- [ ] Docker Postgres comes up healthy with pgvector enabled
- [ ] `pnpm db:migrate` creates all 20 tables
- [ ] `pnpm test` is green across all packages
- [ ] API at `:4000` returns `/health`
- [ ] Web at `:3000` lists stories, can create one
- [ ] User can generate a Bible (confirmed by inspection of the saved row)
- [ ] `llm_calls` has a row per generation attempt (mock or live)
- [ ] No live LLM calls happened automatically — only the manual `smoke-bible.ts` script can do so

---

## What's NOT in Plan 1 (handed off to Plan 2)

- Embedding service
- Context builder (HOT/WARM/COLD assembly)
- Packet generator + auditor
- Writer agent
- Deterministic + LLM validators
- Auto-fixer
- Canon extractor
- Pending canon updates + conflict detector + canon merger
- Summary compactor
- Manual character/arc CRUD UI
- Chapter view UI
- Chapter generation orchestrator
