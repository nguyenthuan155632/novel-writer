import { pgTable, uuid, text, boolean, timestamp, unique } from 'drizzle-orm/pg-core';

export const promptVersions = pgTable('prompt_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentRole: text('agent_role').notNull(),
  version: text('version').notNull(),
  template: text('template').notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  roleVersionUnique: unique('prompt_versions_role_version_uq').on(t.agentRole, t.version),
}));

export type PromptVersion = typeof promptVersions.$inferSelect;
export type NewPromptVersion = typeof promptVersions.$inferInsert;
