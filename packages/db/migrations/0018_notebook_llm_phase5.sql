ALTER TABLE "chapters"
  ADD COLUMN "generation_mode" text DEFAULT 'single_pass' NOT NULL,
  ADD COLUMN "polish_pass_status" text DEFAULT 'skipped' NOT NULL;

ALTER TABLE "chapter_packets"
  ADD COLUMN "high_stakes" boolean DEFAULT false NOT NULL;
