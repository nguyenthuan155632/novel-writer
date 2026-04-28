import { pgTable, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

export const storySettings = pgTable('story_settings', {
  storyId: uuid('story_id').primaryKey().references(() => stories.id, { onDelete: 'cascade' }),
  overrides: jsonb('overrides').$type<Record<string, unknown>>().default({}).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type StorySettings = typeof storySettings.$inferSelect;
export type NewStorySettings = typeof storySettings.$inferInsert;
