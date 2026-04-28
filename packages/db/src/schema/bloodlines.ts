import { pgTable, uuid, text, jsonb } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

export const bloodlines = pgTable('bloodlines', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  rank: text('rank'),
  source: text('source'),
  traits: jsonb('traits').$type<string[]>().default([]).notNull(),
  risks: jsonb('risks').$type<string[]>().default([]).notNull(),
  compatibility: jsonb('compatibility').$type<Record<string, string>>().default({}).notNull(),
  evolutionPath: jsonb('evolution_path').$type<string[]>().default([]).notNull(),
  notes: text('notes'),
});

export type Bloodline = typeof bloodlines.$inferSelect;
export type NewBloodline = typeof bloodlines.$inferInsert;
