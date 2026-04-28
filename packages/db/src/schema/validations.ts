import { pgTable, uuid, boolean, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';
import { chapters } from './chapters.ts';

export const validations = pgTable('validations', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  pass: boolean('pass').notNull(),
  severity: text('severity').default('medium').notNull(),
  issues: jsonb('issues').$type<unknown[]>().default([]).notNull(),
  requiredFixes: jsonb('required_fixes').$type<string[]>().default([]).notNull(),
  validatorModel: text('validator_model'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Validation = typeof validations.$inferSelect;
export type NewValidation = typeof validations.$inferInsert;
