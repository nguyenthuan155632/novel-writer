import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

export const storyBibles = pgTable('story_bibles', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  version: integer('version').default(1).notNull(),
  worldRules: text('world_rules').notNull(),
  cultivationSystem: text('cultivation_system').notNull(),
  bloodlineSystem: text('bloodline_system').notNull(),
  styleGuide: text('style_guide').notNull(),
  forbiddenRules: text('forbidden_rules').notNull(),
  endingDirection: text('ending_direction'),
  compactSummary: text('compact_summary'),
  styleFewShots: jsonb('style_few_shots').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type StoryBible = typeof storyBibles.$inferSelect;
export type NewStoryBible = typeof storyBibles.$inferInsert;
