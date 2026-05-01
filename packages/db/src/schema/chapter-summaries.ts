import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';
import { chapters } from './chapters.ts';
import { vector1536 } from './canon-facts.ts';

export const chapterSummaries = pgTable('chapter_summaries', {
  chapterId: uuid('chapter_id').primaryKey().references(() => chapters.id, { onDelete: 'cascade' }),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  chapterNumber: integer('chapter_number').notNull(),
  summary: text('summary').notNull(),
  embedding: vector1536('embedding'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ChapterSummary = typeof chapterSummaries.$inferSelect;
export type NewChapterSummary = typeof chapterSummaries.$inferInsert;
