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
