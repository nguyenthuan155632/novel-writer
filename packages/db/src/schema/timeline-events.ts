import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';
import type { ImportanceLevel } from '@novel/core';

export const timelineEvents = pgTable('timeline_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  chapterNumber: integer('chapter_number').notNull(),
  eventType: text('event_type'),
  eventText: text('event_text').notNull(),
  importance: text('importance').$type<ImportanceLevel>().default('medium').notNull(),
  threadId: text('thread_id'),
  parallelSagaId: uuid('parallel_saga_id'),
  relatedCharacterIds: jsonb('related_character_ids').$type<string[]>().default([]).notNull(),
  relatedThreadIds: jsonb('related_thread_ids').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type NewTimelineEvent = typeof timelineEvents.$inferInsert;
