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
