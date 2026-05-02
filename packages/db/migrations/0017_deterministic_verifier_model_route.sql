UPDATE "llm_provider_settings"
SET "model_routes" = "model_routes" || '{"deterministic_verifier":"google/gemini-2.5-flash"}'::jsonb
WHERE NOT ("model_routes" ? 'deterministic_verifier');
