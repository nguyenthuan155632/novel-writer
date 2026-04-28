import { pgTable, uuid, text, integer, timestamp, jsonb, unique } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

export const sagas = pgTable('sagas', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  sagaNumber: integer('saga_number').notNull(),
  title: text('title').notNull(),
  startChapter: integer('start_chapter'),
  endChapter: integer('end_chapter'),
  rollingSummary: text('rolling_summary'),
  summaryVersion: integer('summary_version').default(0).notNull(),
  mainThemes: jsonb('main_themes').$type<string[]>().default([]).notNull(),
  majorMysteries: jsonb('major_mysteries').$type<string[]>().default([]).notNull(),
  status: text('status').default('planned').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  storyNumber: unique('sagas_story_saga_number_uq').on(t.storyId, t.sagaNumber),
}));

export type Saga = typeof sagas.$inferSelect;
export type NewSaga = typeof sagas.$inferInsert;
