ALTER TABLE "llm_provider_state" DROP CONSTRAINT "llm_provider_state_active_provider_llm_provider_settings_provider_fk";
--> statement-breakpoint
ALTER TABLE "llm_provider_settings" DROP CONSTRAINT "llm_provider_settings_provider_check";
--> statement-breakpoint
INSERT INTO "llm_provider_settings" ("provider", "model_routes", "created_at", "updated_at")
SELECT 'openai-compatible', "model_routes", "created_at", now()
FROM "llm_provider_settings"
WHERE "provider" = ('open' || 'code')
ON CONFLICT ("provider") DO UPDATE SET
  "model_routes" = EXCLUDED."model_routes",
  "updated_at" = now();
--> statement-breakpoint
UPDATE "llm_provider_state"
SET "active_provider" = 'openai-compatible', "updated_at" = now()
WHERE "active_provider" = ('open' || 'code');
--> statement-breakpoint
DELETE FROM "llm_provider_settings"
WHERE "provider" = ('open' || 'code');
--> statement-breakpoint
ALTER TABLE "llm_provider_settings" ADD CONSTRAINT "llm_provider_settings_provider_check" CHECK ("provider" IN ('openai-compatible', 'openrouter', 'ollama', 'vmlx'));
--> statement-breakpoint
ALTER TABLE "llm_provider_state" ADD CONSTRAINT "llm_provider_state_active_provider_llm_provider_settings_provider_fk"
  FOREIGN KEY ("active_provider") REFERENCES "public"."llm_provider_settings"("provider") ON DELETE no action ON UPDATE no action;
