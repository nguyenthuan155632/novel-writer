ALTER TABLE "sagas"
  ADD COLUMN "parent_timeline_id" uuid,
  ADD COLUMN "convergence_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN "parallel_threads" jsonb DEFAULT '[]'::jsonb NOT NULL;

ALTER TABLE "timeline_events"
  ADD COLUMN "thread_id" text,
  ADD COLUMN "parallel_saga_id" uuid;
