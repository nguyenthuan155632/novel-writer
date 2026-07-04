import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { stories } from "./stories.ts";
import { sagas } from "./sagas.ts";

export const arcs = pgTable("arcs", {
  id: uuid("id").primaryKey().defaultRandom(),
  storyId: uuid("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  sagaId: uuid("saga_id").references(() => sagas.id, { onDelete: "set null" }),
  arcNumber: integer("arc_number"),
  title: text("title").notNull(),
  premise: text("premise"),
  startChapter: integer("start_chapter"),
  endChapter: integer("end_chapter"),
  summary: text("summary"),
  mainConflict: text("main_conflict"),
  expectedChanges: jsonb("expected_changes")
    .$type<string[]>()
    .default([])
    .notNull(),
  completedChanges: jsonb("completed_changes")
    .$type<number[]>()
    .default([])
    .notNull(),
  seedsToResolveInArc: jsonb("seeds_to_resolve_in_arc")
    .$type<string[]>()
    .default([])
    .notNull(),
  coveredTurningPoints: jsonb("covered_turning_points")
    .$type<number[]>()
    .default([])
    .notNull(),
  expectedCharacterChanges: jsonb("expected_character_changes")
    .$type<string[]>()
    .default([])
    .notNull(),
  expectedPowerChanges: jsonb("expected_power_changes")
    .$type<string[]>()
    .default([])
    .notNull(),
  rollingSummary: text("rolling_summary"),
  summaryVersion: integer("summary_version").default(0).notNull(),
  lastCompactedChapter: integer("last_compacted_chapter"),
  plantedSeedIds: jsonb("planted_seed_ids")
    .$type<string[]>()
    .default([])
    .notNull(),
  status: text("status").default("planned").notNull(),
  summaryUpdatedAt: timestamp("summary_updated_at", { withTimezone: true }),
});

export type Arc = typeof arcs.$inferSelect;
export type NewArc = typeof arcs.$inferInsert;
