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
