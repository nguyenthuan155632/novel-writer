# Writing Studio UI Refresh Design

## Summary

Refresh the Novel Writer web UI so story-facing pages feel like a polished Writing Studio instead of plain default pages. Apply the studio visual language to the homepage and all `/stories/*` routes. Keep `/admin` neutral and utility-focused.

This is a presentation-only refactor. Existing API calls, route behavior, server/client component boundaries, event handlers, form submissions, and data transformations stay unchanged.

## Goals

- Give the homepage and story workspace a warmer editorial feel with improved hierarchy, spacing, typography, cards, forms, tables, and navigation.
- Preserve all current behavior and page logic.
- Keep `/admin` operational and neutral, while allowing shared baseline improvements such as better global form/button defaults.
- Make pages easier to scan during repeated writing and production workflows.

## Non-Goals

- No backend changes.
- No API contract changes.
- No route restructuring.
- No new state management.
- No new design dependency unless already present in the app.
- No logic changes in generation, canon updates, provider switching, admin metrics, or settings flows.

## Visual Direction

Story-facing pages use the approved Writing Studio direction:

- Warm paper-like backgrounds.
- Dark ink text with restrained accent colors.
- Editorial page headers with clear titles and supporting metadata.
- Cards with low-radius corners, subtle borders, and calm shadows.
- Forms and textareas optimized for long-form writing input.
- Tables and dense lists remain compact enough for production workflows.

The design should avoid a marketing landing-page feel. The first screen should remain the usable app experience.

## Scope

Apply the refresh to:

- `apps/web/app/layout.tsx`
- `apps/web/app/globals.css`
- `apps/web/app/page.tsx`
- `apps/web/app/provider-switcher.tsx`
- All non-admin story pages and local story components under `apps/web/app/stories/**`

Keep `/admin` visually separate:

- `apps/web/app/admin/page.tsx`
- `apps/web/app/admin/model-settings.tsx`
- `apps/web/app/admin/prompts/**`

Admin pages may inherit global button, input, and table baseline styling, but should not get the warmer studio page shell or editorial treatment.

## Architecture

Use CSS classes and existing JSX as the primary mechanism. Introduce shared utility classes in `globals.css` for page shells, panels, cards, lists, tables, metadata rows, actions, and form groups.

Update page markup only where needed to attach these classes or add presentational wrappers. Avoid changing component props, async data loading, client state, mutations, API paths, or conditional rendering logic.

## Data Flow

No data flow changes. All current `apiFetch` calls, imported API helpers, form actions, client-side effects, and button handlers remain intact.

## Error Handling

Keep existing error messages and conditions. Improve presentation by styling existing error elements and empty states, but do not alter when errors appear or how they are generated.

## Testing

Verification should focus on:

- `pnpm --filter @novel/web typecheck`
- `pnpm --filter @novel/web build`
- A browser pass through homepage, story routes, form pages, and `/admin`

Because this is visual-only, unit tests are not required unless type or markup changes expose a behavioral risk.

## Risks

- Broad page markup changes can accidentally affect client component behavior. Keep edits small and preserve existing form fields, names, event handlers, and links.
- Global CSS can unintentionally restyle `/admin`. Use page-specific classes for the Writing Studio treatment and keep admin selectors explicit.
- Existing dirty work in `apps/web/app/admin/page.tsx` must be preserved.
