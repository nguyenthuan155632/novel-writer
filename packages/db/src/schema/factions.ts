import { pgTable, uuid, text, jsonb } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

export const factions = pgTable('factions', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type'),
  ideology: text('ideology'),
  powerLevel: text('power_level'),
  knownMembers: jsonb('known_members').$type<string[]>().default([]).notNull(),
  alliances: jsonb('alliances').$type<string[]>().default([]).notNull(),
  enemies: jsonb('enemies').$type<string[]>().default([]).notNull(),
  status: text('status').default('active').notNull(),
  notes: text('notes'),
});

export type Faction = typeof factions.$inferSelect;
export type NewFaction = typeof factions.$inferInsert;
