---
type: route
source: apps/api/src/routes/health.ts
---

# Route: Health

**Type:** API Route Handler  
**Source:** `apps/api/src/routes/health.ts`

## Responsibility
Provides a lightweight liveness check endpoint that confirms the API process is running and returns the current server timestamp.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Returns `{ status: 'ok', ts: <ISO 8601 timestamp> }` |

## Inputs
- No request body
- No URL params

## Outputs
- `200 { status: 'ok', ts: string }` — always succeeds as long as the process is alive

## Depends on
- [[app-api]] — registered as Fastify plugin
- (no database access, no external services)

## Used by
- [[app-web]] — may be polled for server connectivity detection
- [[app-api]] — registered here
- Load balancers / uptime monitors (primary consumer)

## Related database tables
- (none)

## Related flows
- (none)

## Related domain concepts
- Liveness probing (does not check database or Redis connectivity — use a dedicated readiness check for that)
