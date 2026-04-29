import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const llmProviderSettings = pgTable('llm_provider_settings', {
  provider: text('provider').primaryKey(),
  modelRoutes: jsonb('model_routes').$type<Record<string, string>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const llmProviderState = pgTable('llm_provider_state', {
  id: text('id').primaryKey(),
  activeProvider: text('active_provider').notNull().references(() => llmProviderSettings.provider),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type LlmProviderSettings = typeof llmProviderSettings.$inferSelect;
export type NewLlmProviderSettings = typeof llmProviderSettings.$inferInsert;
export type LlmProviderState = typeof llmProviderState.$inferSelect;
export type NewLlmProviderState = typeof llmProviderState.$inferInsert;
