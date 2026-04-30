import { pgTable, uuid, text, integer, timestamp, jsonb, boolean, customType } from 'drizzle-orm/pg-core';
import { stories } from './stories.ts';

const vector1536 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return value.replace(/[\[\]]/g, '').split(',').map(Number);
  },
});

export const canonFacts = pgTable('canon_facts', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  topic: text('topic').default('').notNull(),
  fact: text('fact').notNull(),
  sourceChapter: integer('source_chapter'),
  importance: text('importance').default('medium').notNull(),
  locked: boolean('locked').default(false).notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  embedding: vector1536('embedding'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type CanonFact = typeof canonFacts.$inferSelect;
export type NewCanonFact = typeof canonFacts.$inferInsert;
export { vector1536 };
