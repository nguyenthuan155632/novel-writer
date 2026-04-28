import { pgTable, uuid, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { chapters } from './chapters.ts';

export const contextPackets = pgTable('context_packets', {
  id: uuid('id').primaryKey().defaultRandom(),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  hotTierHash: text('hot_tier_hash').notNull(),
  warmTierHash: text('warm_tier_hash').notNull(),
  coldPayload: jsonb('cold_payload').$type<Record<string, unknown>>().notNull(),
  totalInputTokens: integer('total_input_tokens'),
  cachedInputTokens: integer('cached_input_tokens'),
  configSnapshot: jsonb('config_snapshot').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ContextPacket = typeof contextPackets.$inferSelect;
export type NewContextPacket = typeof contextPackets.$inferInsert;
