ALTER TABLE "sagas" ADD COLUMN IF NOT EXISTS "premise" text;
--> statement-breakpoint
ALTER TABLE "sagas" ADD COLUMN IF NOT EXISTS "expected_turning_points" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "sagas" ADD COLUMN IF NOT EXISTS "summary_updated_at" timestamp with time zone;
