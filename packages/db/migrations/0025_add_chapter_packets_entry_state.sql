DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chapter_packets' AND column_name = 'entry_state') THEN
    ALTER TABLE "chapter_packets" ADD COLUMN "entry_state" jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chapter_packets' AND column_name = 'active_location_key') THEN
    ALTER TABLE "chapter_packets" ADD COLUMN "active_location_key" text;
  END IF;
END $$;