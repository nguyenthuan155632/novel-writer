---
type: route
source: apps/api/src/routes/admin.ts
---

# Route: Admin

**Type:** API Route Handler  
**Source:** `apps/api/src/routes/admin.ts`

## Responsibility
Exposes operational controls for switching LLM providers, overriding per-role model routes, and reading system-wide metrics snapshots.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/metrics` | Returns a system metrics snapshot via `AdminMetricsService.snapshot()` |
| GET | `/api/admin/provider` | Returns the current active provider and its status |
| PUT | `/api/admin/provider` | Switches the active LLM provider; body validated by `ProviderBodySchema` |
| GET | `/api/admin/models` | Returns per-role model routes for the active provider |
| PUT | `/api/admin/models` | Overrides per-role model routes for the active provider; body validated by `ModelRoutesSchema` |

## Inputs
- **`ProviderBodySchema`** — `{ provider: 'opencode' | 'openrouter' | 'ollama' | 'vmlx' }`
- **`ModelRoutesSchema`** — `{ routes: { [AgentRole]: string? } }` — roles enumerated dynamically from `MODEL_OPTIONS`
- No URL params

## Outputs
- `GET /admin/metrics` → arbitrary metrics object from `AdminMetricsService`
- `GET /api/admin/provider` → provider status object
- `PUT /api/admin/provider` → updated provider status object
- `GET /api/admin/models` → `{ routes: Record<AgentRole, string> }`
- `PUT /api/admin/models` → updated model routes object

## Depends on
- [[app-api]] — registered as Fastify plugin
- [[package-db]] — database access via `getDb()` (used inside `AdminMetricsService`)
- [[package-core]] — `AdminMetricsService`, `MODEL_OPTIONS`
- [[modules/provider-switcher]] — `getProviderStatus`, `setActiveProvider`, `getModelStatusForActiveProvider`, `setModelRoutesForActiveProvider`

## Used by
- [[app-web]] — admin dashboard calls these endpoints
- [[app-api]] — registered here

## Related database tables
- [[database/tables/llm-provider-settings]]
- [[database/tables/llm-provider-state]]

## Related flows
- (none — purely synchronous control-plane operations)

## Related domain concepts
- LLM provider switching (runtime hot-swap of the active provider)
- Model routing (mapping `AgentRole` → model string at runtime)
