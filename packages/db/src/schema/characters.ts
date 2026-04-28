import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

export const characters = pgTable('characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  version: integer('version').default(1).notNull(),
  name: text('name').notNull(),
  role: text('role'),
  personality: text('personality'),
  origin: text('origin'),
  goals: jsonb('goals').$type<string[]>().default([]).notNull(),
  currentRealm: text('current_realm'),
  currentBloodlines: jsonb('current_bloodlines').$type<string[]>().default([]).notNull(),
  abilities: jsonb('abilities').$type<string[]>().default([]).notNull(),
  secrets: jsonb('secrets').$type<string[]>().default([]).notNull(),
  relationships: jsonb('relationships').$type<Record<string, string>>().default({}).notNull(),
  inventory: jsonb('inventory').$type<string[]>().default([]).notNull(),
  status: text('status').default('alive').notNull(),
  lastSeenChapter: integer('last_seen_chapter').default(0).notNull(),
  canonNotes: text('canon_notes'),
  lockedFields: jsonb('locked_fields').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
