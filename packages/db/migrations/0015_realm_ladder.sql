-- Add structured realm ladder for cultivation stories.
-- Populated by bible generator (power_system_kind='cultivation').
-- Validators use this instead of parsing free-form cultivation_system text.

ALTER TABLE story_bibles
  ADD COLUMN realm_ladder jsonb NULL;
