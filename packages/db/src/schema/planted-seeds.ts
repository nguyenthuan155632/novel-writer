import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

export const plantedSeeds = pgTable('planted_seeds', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  seedText: text('seed_text').notNull(),
  payoffDescription: text('payoff_description').notNull(),
  plantWindowStart: integer('plant_window_start').notNull(),
  plantWindowEnd: integer('plant_window_end').notNull(),
  payoffChapter: integer('payoff_chapter'),
  plantedInChapter: integer('planted_in_chapter'),
  status: text('status').default('pending').notNull(),
  createdByAgent: text('created_by_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  byStoryStatusWindow: index('planted_seeds_story_status_window_idx').on(t.storyId, t.status, t.plantWindowStart),
}));

export type PlantedSeed = typeof plantedSeeds.$inferSelect;
export type NewPlantedSeed = typeof plantedSeeds.$inferInsert;
