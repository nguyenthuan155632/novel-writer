-- packages/db/migrations/0013_bible_generic_power_system.sql

ALTER TABLE story_bibles
  ADD COLUMN power_system text NULL,
  ADD COLUMN power_system_kind text NOT NULL DEFAULT 'cultivation';

ALTER TABLE story_bibles
  ALTER COLUMN cultivation_system DROP NOT NULL,
  ALTER COLUMN bloodline_system DROP NOT NULL;

UPDATE story_bibles
  SET power_system = COALESCE(cultivation_system, '') || E'\n\n' || COALESCE(bloodline_system, '')
  WHERE power_system IS NULL;

UPDATE story_bibles
  SET power_system = '(legacy bible — chưa migrate, cần regenerate hoặc edit thủ công)'
  WHERE power_system IS NULL OR length(trim(power_system)) < 50;

ALTER TABLE story_bibles
  ALTER COLUMN power_system SET NOT NULL;
