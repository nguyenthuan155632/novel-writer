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
