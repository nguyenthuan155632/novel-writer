---
type: app
source: apps/web/
---

# App: Web Dashboard

## Type
Next.js 15 (App Router) frontend

## Source Evidence
`apps/web/app/` — pages
`apps/web/lib/api-client.ts` — REST API client
`apps/web/app/globals.css` — vanilla CSS (no utility frameworks)

## Responsibility
Single-user dashboard for reading generated chapters, reviewing canon, managing seeds, monitoring costs, configuring providers, and triggering generation.

## Key Pages
- `/` — stories list
- `/stories/:id` — story dashboard
- `/read/:storyId/:chapterNumber` — chapter reader
- `/admin/` — LLM provider + model management
- `/preview/` — chapter preview

## Key Modules
- `lib/api-client.ts` — typed REST client for [[apps/app-api]]
- `lib/api/` — per-resource API functions
- `lib/hooks/` — React hooks

## Styling
Vanilla CSS only. No CSS-in-JS, no Tailwind.

## Depends On
- [[apps/app-api]] — all data via REST
- [[external-services/postgresql]] — (indirect, via API)

## Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/llm-provider-flow]]
---
type: app
source: apps/web/
---

# App: Web Dashboard

## Type
Next.js 15 (App Router) frontend

## Source Evidence
`apps/web/app/` — pages (stories, read, admin, preview)
`apps/web/lib/api-client.ts` — typed REST API client
`apps/web/app/globals.css` — vanilla CSS only

## Responsibility
Single-user dashboard for reading generated chapters, reviewing canon, managing seeds, monitoring costs, configuring LLM providers, and triggering generation.

## Key Pages
- `/` — stories list
- `/stories/:id` — story dashboard
- `/read/:storyId/:chapterNumber` — chapter reader
- `/admin/` — LLM provider and model management
- `/preview/` — chapter preview

## Depends On
- [[apps/app-api]] — all data via REST

## Styling
Vanilla CSS only (`globals.css`, component `.css` files). No CSS-in-JS, no Tailwind.

## Related Flows
- [[flows/chapter-generation-flow]]
- [[flows/llm-provider-flow]]
