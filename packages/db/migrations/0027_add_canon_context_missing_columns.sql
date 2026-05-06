ALTER TABLE "canon_facts" ADD COLUMN "valid_until_chapter" integer;
ALTER TABLE "canon_facts" ADD COLUMN "known_by" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "canon_facts" ADD COLUMN "visibility" text DEFAULT 'visible' NOT NULL;
ALTER TABLE "context_packets" ADD COLUMN "active_location_key" text;