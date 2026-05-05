ALTER TABLE "batches"
  ADD COLUMN "checkpoint_chapter" integer,
  ADD COLUMN "resumed_from_chapter" integer;
