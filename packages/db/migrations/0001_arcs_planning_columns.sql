ALTER TABLE "arcs" ADD COLUMN IF NOT EXISTS "premise" text;
--> statement-breakpoint
ALTER TABLE "arcs" ADD COLUMN IF NOT EXISTS "expected_changes" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "arcs" ADD COLUMN IF NOT EXISTS "seeds_to_resolve_in_arc" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "arcs" ADD COLUMN IF NOT EXISTS "summary_updated_at" timestamp with time zone;
