ALTER TABLE "llm_provider_settings" DROP CONSTRAINT "llm_provider_settings_provider_check";
--> statement-breakpoint
ALTER TABLE "llm_provider_settings" ADD CONSTRAINT "llm_provider_settings_provider_check" CHECK ("provider" IN ('opencode', 'openrouter', 'ollama', 'vmlx'));
--> statement-breakpoint
INSERT INTO "llm_provider_settings" ("provider", "model_routes")
VALUES (
  'vmlx',
  '{
    "bible_generator":"google/gemini-2.5-flash",
    "saga_planner":"google/gemini-2.5-flash",
    "arc_planner":"google/gemini-2.5-flash",
    "packet_generator":"google/gemini-2.5-flash",
    "writer":"google/gemini-2.5-flash",
    "auto_fixer":"google/gemini-2.5-flash",
    "llm_validator":"google/gemini-2.5-flash",
    "canon_extractor":"google/gemini-2.5-flash",
    "summary_compactor":"google/gemini-2.5-flash",
    "arc_summary_compactor":"google/gemini-2.5-flash",
    "high_stakes_reviewer":"google/gemini-2.5-flash"
  }'::jsonb
)
ON CONFLICT ("provider") DO NOTHING;
