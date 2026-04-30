-- Add total_cost_usd to stories for fast cost aggregation
ALTER TABLE stories ADD COLUMN IF NOT EXISTS total_cost_usd numeric(12,6) NOT NULL DEFAULT 0;

-- Backfill existing stories from llm_calls
UPDATE stories s
SET total_cost_usd = COALESCE((
  SELECT SUM(estimated_cost_usd)
  FROM llm_calls
  WHERE llm_calls.story_id = s.id
), 0);
