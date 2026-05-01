import { pgTable, uuid, text, integer, timestamp, numeric } from 'drizzle-orm/pg-core';

export const stories = pgTable('stories', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  premise: text('premise').notNull(),
  genre: text('genre').default('tien_hiep').notNull(),
  mainCharacterPersonality: text('main_character_personality').default('tram_on').notNull(),
  tone: text('tone'),
  targetChapterCount: integer('target_chapter_count').default(1000).notNull(),
  status: text('status').default('draft').notNull(),
  totalCostUsd: numeric('total_cost_usd', { precision: 12, scale: 6 }).default('0').notNull(),
  genreLockedAt: timestamp('genre_locked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;
