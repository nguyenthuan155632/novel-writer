ALTER TABLE "planted_seeds" ADD COLUMN IF NOT EXISTS "seed_key" text;
--> statement-breakpoint
ALTER TABLE "planted_seeds" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "planted_seeds" ADD COLUMN IF NOT EXISTS "importance" text DEFAULT 'minor';
--> statement-breakpoint
ALTER TABLE "planted_seeds" ADD COLUMN IF NOT EXISTS "paid_off_at_chapter" integer;
--> statement-breakpoint
UPDATE "planted_seeds" SET "seed_key" = 'legacy-' || "id"::text WHERE "seed_key" IS NULL;
--> statement-breakpoint
UPDATE "planted_seeds" SET "description" = "seed_text" WHERE "description" IS NULL;
--> statement-breakpoint
ALTER TABLE "planted_seeds" ALTER COLUMN "seed_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "planted_seeds" ALTER COLUMN "description" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "planted_seeds" ALTER COLUMN "importance" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "planted_seeds_story_seed_key_uq" ON "planted_seeds" ("story_id", "seed_key");
