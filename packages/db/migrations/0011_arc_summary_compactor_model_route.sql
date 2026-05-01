UPDATE "llm_provider_settings"
SET "model_routes" = "model_routes" || '{"arc_summary_compactor":"google/gemini-2.5-flash"}'::jsonb
WHERE NOT ("model_routes" ? 'arc_summary_compactor');
