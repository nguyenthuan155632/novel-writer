# Global Provider Switcher Design

## Goal

Add a simple global provider switcher for selecting whether live LLM calls use OpenCode or OpenRouter.

The switcher is operational, not per-story: the active provider applies to all API-created LLM providers in the running API process.

## Scope

- Support two provider IDs: `opencode` and `openrouter`.
- Use `NOVEL_LLM_PROVIDER=opencode|openrouter` as the startup default.
- Keep OpenCode as the default when the env var is unset.
- Expose an admin API for reading and updating the active provider.
- Render a compact header switcher so the setting is visible across the app.
- Do not add a database migration or per-story provider override.

## API Design

Add admin routes:

- `GET /api/admin/provider`
  - Returns `{ provider, options }`.
  - `provider` is the current active provider.
  - `options` lists the supported providers and labels.

- `PUT /api/admin/provider`
  - Accepts `{ provider: "opencode" | "openrouter" }`.
  - Updates the process-level active provider.
  - Returns the same payload as `GET`.

Invalid provider values return request validation errors through the existing Fastify error handler.

## Provider Construction

Create a shared API helper that owns the active provider state and constructs the correct `LLMProvider`.

- `opencode` uses `OpenCodeProvider` with `OPENCODE_API_KEY` and optional `OPENCODE_BASE_URL`.
- `openrouter` uses `OpenRouterProvider` with `OPENROUTER_API_KEY`, optional `OPENROUTER_BASE_URL`, optional `OPENROUTER_HTTP_REFERER`, and optional `OPENROUTER_X_TITLE`.
- Mock mode remains unchanged. If `NOVEL_FORCE_MOCK_LLM=1` or a route passes a mock response, the mock provider is used regardless of selected live provider.
- The selected live provider is wrapped in `LoggedLLMProvider` as before.

## UI Design

Add a small client component in the app header:

- Shows two choices: OpenCode and OpenRouter.
- Loads the current provider on mount.
- Sends `PUT /api/admin/provider` when changed.
- Displays a concise error if loading or saving fails.
- Uses existing plain styling and does not introduce a new design system.

## Testing

Add API tests for:

- Default provider resolves to OpenCode when env is unset.
- Env default can select OpenRouter.
- Admin route returns provider options.
- Admin route updates the active provider.
- Provider construction chooses OpenRouter when selected and OpenCode when selected.
- Mock mode still bypasses live provider selection.

Web has no unit test setup, so the UI is verified by TypeScript/build checks.
