import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

export const batches = pgTable('batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  startChapter: integer('start_chapter').notNull(),
  endChapter: integer('end_chapter').notNull(),
  mode: text('mode', { enum: ['safe', 'semi_auto', 'full_auto'] }).notNull(),
  status: text('status', { enum: ['running', 'completed', 'paused', 'failed', 'cancelled'] }).notNull().default('running'),
  pausedReason: text('paused_reason'),
  completedChapters: integer('completed_chapters').notNull().default(0),
  totalCostUsd: text('total_cost_usd').notNull().default('0'),
  meta: jsonb('meta').notNull().default({}),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});

export type Batch = typeof batches.$inferSelect;
export type NewBatch = typeof batches.$inferInsert;