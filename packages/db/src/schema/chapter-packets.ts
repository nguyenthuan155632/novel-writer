import type { EntryState } from "@novel/core";
import { pgTable, uuid, text, integer, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';
import { chapters } from './chapters.ts';
import { arcs } from './arcs.ts';

export const chapterPackets = pgTable('chapter_packets', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapter_id').references(() => chapters.id, { onDelete: 'cascade' }),
  arcId: uuid('arc_id').references(() => arcs.id, { onDelete: 'set null' }),
  chapterNumber: integer('chapter_number').notNull(),
  goal: text('goal').notNull(),
  requiredEvents: jsonb('required_events').$type<string[]>().default([]).notNull(),
  charactersInScene: jsonb('characters_in_scene').$type<string[]>().default([]).notNull(),
  conflict: text('conflict'),
  cliffhanger: text('cliffhanger'),
  forbiddenMoves: jsonb('forbidden_moves').$type<string[]>().default([]).notNull(),
  highStakes: boolean('high_stakes').default(false).notNull(),
  contextNotes: text('context_notes'),
  entryState: jsonb('entry_state').$type<EntryState>(),
  activeLocationKey: text('active_location_key'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ChapterPacket = typeof chapterPackets.$inferSelect;
export type NewChapterPacket = typeof chapterPackets.$inferInsert;
