import { pgTable, uuid, text, integer, jsonb } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';
import { sagas } from './sagas.ts';

export const arcs = pgTable('arcs', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  sagaId: uuid('saga_id').references(() => sagas.id, { onDelete: 'set null' }),
  arcNumber: integer('arc_number'),
  title: text('title').notNull(),
  startChapter: integer('start_chapter'),
  endChapter: integer('end_chapter'),
  summary: text('summary'),
  mainConflict: text('main_conflict'),
  expectedCharacterChanges: jsonb('expected_character_changes').$type<string[]>().default([]).notNull(),
  expectedPowerChanges: jsonb('expected_power_changes').$type<string[]>().default([]).notNull(),
  rollingSummary: text('rolling_summary'),
  summaryVersion: integer('summary_version').default(0).notNull(),
  plantedSeedIds: jsonb('planted_seed_ids').$type<string[]>().default([]).notNull(),
  status: text('status').default('planned').notNull(),
});

export type Arc = typeof arcs.$inferSelect;
export type NewArc = typeof arcs.$inferInsert;
