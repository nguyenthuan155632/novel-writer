CREATE TABLE "llm_provider_settings" (
  "provider" text PRIMARY KEY NOT NULL,
  "model_routes" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "llm_provider_settings_provider_check" CHECK ("provider" IN ('opencode', 'openrouter', 'ollama', 'vmlx')),
  CONSTRAINT "llm_provider_settings_model_routes_object_check" CHECK (jsonb_typeof("model_routes") = 'object')
);
--> statement-breakpoint
CREATE TABLE "llm_provider_state" (
  "id" text PRIMARY KEY NOT NULL,
  "active_provider" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "llm_provider_state_singleton_check" CHECK ("id" = 'global')
);
--> statement-breakpoint
ALTER TABLE "llm_provider_state" ADD CONSTRAINT "llm_provider_state_active_provider_llm_provider_settings_provider_fk"
  FOREIGN KEY ("active_provider") REFERENCES "public"."llm_provider_settings"("provider") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "llm_provider_settings" ("provider", "model_routes")
VALUES
  (
    'opencode',
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
  ),
  (
    'openrouter',
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
  ),
  (
    'ollama',
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
  ),
  (
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
  );
--> statement-breakpoint
INSERT INTO "llm_provider_state" ("id", "active_provider")
VALUES ('global', 'opencode');
