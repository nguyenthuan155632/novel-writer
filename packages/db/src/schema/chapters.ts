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
