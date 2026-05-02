ALTER TABLE "arcs" ADD COLUMN IF NOT EXISTS "covered_turning_points" jsonb DEFAULT '[]'::jsonb NOT NULL;
