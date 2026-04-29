import { pgTable, uuid, text, integer, timestamp, jsonb, numeric } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';
import { chapters } from './chapters.ts';

export const highStakesReviews = pgTable('high_stakes_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  triggerReason: text('trigger_reason', { enum: ['arc_end', 'critical_severity', 'manual'] }).notNull(),
  approve: text('approve').notNull(),
  concerns: jsonb('concerns').$type<{ category: string; severity: string; description: string; quote?: string }[]>().notNull().default([]),
  recommendedActions: jsonb('recommended_actions').$type<{ action: string; rationale: string }[]>().notNull().default([]),
  tokens: integer('tokens').notNull().default(0),
  costUsd: text('cost_usd').notNull().default('0'),
  promptVersion: text('prompt_version'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type HighStakesReview = typeof highStakesReviews.$inferSelect;
export type NewHighStakesReview = typeof highStakesReviews.$inferInsert;