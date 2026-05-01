# Reader UI Design

**Date:** 2026-05-01
**Status:** Approved

## Overview

A mobile-first novel reader page that lets users read generated chapters in a comfortable, customizable reading environment. Separate from the existing studio admin UI — no sidebar, no admin chrome. Looks and feels like a real novel reading app.

## Approach

Client component with `use client` + `localStorage`. The page server-fetches chapter and story data, then passes it to a `ReaderView` client component. All reader preferences are managed in a `useReaderSettings` hook backed by `localStorage` so settings persist across sessions. No new libraries required.

## Routes & Files

Two new files only. Zero changes to existing logic:

```
apps/web/app/read/[storyId]/[chapterNumber]/
  page.tsx          — server component: fetches chapter + story, renders <ReaderView>
  ReaderView.tsx    — 'use client': all reader UI, settings state, settings panel, chapter drawer
```

One addition to existing file (no logic changes):
- `apps/web/app/stories/[id]/chapters/[chapterNumber]/page.tsx` — add a "Read" link pointing to `/read/[id]/[chapterNumber]`

## Reader Settings

Managed by a `useReaderSettings` hook in `ReaderView.tsx`. Persisted to `localStorage` under key `novel-reader-settings`.

### Font Family (4 options)
- Georgia (default)
- Arial
- Times New Roman
- Courier New

### Font Size
- Slider, range 14px–28px, step 1px, default 18px

### Background / Text Color Themes (5 presets)
| Name | Background | Text |
|------|------------|------|
| Paper (default) | `#fbf8f1` | `#211f1b` |
| Cream | `#f5f0e8` | `#2a2520` |
| Warm dark | `#1a1510` | `#d4c9b8` |
| Pure dark | `#0f0f0f` | `#cccccc` |
| Sepia | `#f4ecd8` | `#3b2f1e` |

## Layout & UI Structure

### Top Bar (sticky, always visible)
- Left: story title (muted, small) → chapter title (bold)
- Right: gear icon button — toggles settings panel

### Settings Panel (slides down from top bar)
Visible when gear is toggled on. Dismissed by tapping gear again or tapping outside.
- Background color swatches (5 circles, active state with checkmark)
- Font size slider (small A — slider — large A)
- Font family list (4 items, active item shows checkmark)
- "Chapter list" button — opens chapter drawer

### Content Area (scrollable)
- Chapter title as `<h1>` in selected font
- Chapter body text: selected font, selected size, `line-height: 1.8`, `max-width: 680px`, centered
- No summary displayed (clean reader mode)
- Background color applied to full viewport
- If chapter has no content (still generating or failed), show a simple "Content not yet available" message in the content area — no error page

### Chapter Drawer (slides up from bottom)
- Full-width overlay, triggered by "Chapter list" button in settings panel
- Lists all chapters for the story (fetched client-side via existing `fetchChapters`)
- Highlights current chapter
- Tapping any chapter navigates to `/read/[storyId]/[chapterNumber]`
- Dismissed by tapping outside or a close button

### Prev/Next Navigation (bottom of content)
- "← Previous" and "Next →" links below the chapter body
- Hidden when at first (no prev) or last (no next) chapter
- Chapter order determined from the chapter list fetched for the drawer

## Data Fetching

- **Server (page.tsx):** `apiFetch` for `ChapterDetail` and story title — same pattern as existing chapter page
- **Client (ReaderView.tsx):** `fetchChapters` (from `lib/api/chapters.ts`) called once on mount to populate the chapter drawer and compute prev/next chapter numbers

## Constraints

- Mobile-first: all touch targets ≥ 44px, settings panel and drawer sized for thumb reach
- No changes to existing business logic, API routes, or data models
- Reuses existing `apiFetch`, `fetchChapters`, `ChapterDetail`, `ChapterSummary` types
- No new npm dependencies
