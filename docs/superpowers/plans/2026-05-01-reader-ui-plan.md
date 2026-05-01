# Reader UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first novel reader at `/read/[storyId]/[chapterNumber]` with customizable theme, font, and font size (persisted in `localStorage`), a chapter drawer, and prev/next navigation — without touching existing studio logic.

**Architecture:** A Next.js server component fetches the chapter + story title via `apiFetch` and passes them into a `ReaderView` client component. `ReaderView` owns all UI state (theme, font, size, panels, chapter list) via a `useReaderSettings` hook backed by `localStorage`. Pure settings logic is extracted into a small colocated helper module so it can be unit-tested with vitest (the codebase's existing pattern: see `apps/web/test/model-settings-state.test.ts`). No route groups or layout restructuring — the reader page renders a full-viewport `position: fixed` container that visually replaces the existing admin topbar.

**Tech Stack:** Next.js 15 App Router, React 19 client components, `localStorage`, vitest. No new npm dependencies.

## Deviation from Spec

The spec says "Two new files only" inside the reader route. This plan adds:

1. A third colocated helper file `reader-settings.ts` for pure settings utilities so they can be unit-tested in vitest. Without extraction, the pure logic would be trapped inside a `.tsx` file that vitest cannot parse (no `@vitejs/plugin-react` is installed, and the spec forbids new deps).
2. A test file `apps/web/test/reader-settings.test.ts` following the existing test pattern.

This is the minimum deviation that preserves the spec intent (no admin chrome, no business-logic changes, no new deps) while allowing TDD on the pure logic. All React UI still lives in `ReaderView.tsx` as the spec requires.

## File Structure

```
apps/web/app/read/[storyId]/[chapterNumber]/
  page.tsx                # NEW - server component: fetches chapter + story title
  ReaderView.tsx          # NEW - 'use client' - all reader UI, settings state, panels, drawer
  reader-settings.ts      # NEW - pure helpers: types, defaults, parse, clamp, presets

apps/web/test/
  reader-settings.test.ts # NEW - vitest unit tests for pure helpers

apps/web/app/stories/[id]/chapters/[chapterNumber]/
  page.tsx                # MODIFY - add "Read" link in the header (no logic changes)
```

Responsibilities per file:

- **`reader-settings.ts`** — single source of truth for the settings shape, defaults, theme presets, font options, font size bounds, and pure `parseReaderSettings`/`clampFontSize` functions. No React, no DOM access.
- **`ReaderView.tsx`** — `'use client'`. Renders the fullscreen reader shell. Owns: `useReaderSettings` hook (reads/writes `localStorage`), settings panel open state, drawer open state, client-side `fetchChapters` call for drawer + prev/next, and all JSX/inline styles.
- **`page.tsx`** (reader route) — async server component. Awaits params, calls `apiFetch` for chapter and story title, renders `<ReaderView ...props />`. Handles the "chapter not found" / "fetch failed" cases with a minimal fallback inside the same fullscreen shell (so the admin topbar stays hidden).
- **`page.tsx`** (existing chapter admin) — add one anchor in the `.studio-header` actions area pointing to `/read/[id]/[chapterNumber]`. No other changes.

---

### Task 1: Pure reader settings helpers (TDD)

**Files:**

- Create: `apps/web/app/read/[storyId]/[chapterNumber]/reader-settings.ts`
- Test: `apps/web/test/reader-settings.test.ts`

- [ ] **Step 1.1: Write the failing tests for `parseReaderSettings` and `clampFontSize`**

Create `apps/web/test/reader-settings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_READER_SETTINGS,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  clampFontSize,
  parseReaderSettings,
} from '../app/read/[storyId]/[chapterNumber]/reader-settings';

describe('clampFontSize', () => {
  it('returns the size when it is within bounds', () => {
    expect(clampFontSize(18)).toBe(18);
  });

  it('clamps to the minimum when too small', () => {
    expect(clampFontSize(5)).toBe(MIN_FONT_SIZE);
  });

  it('clamps to the maximum when too large', () => {
    expect(clampFontSize(99)).toBe(MAX_FONT_SIZE);
  });

  it('rounds non-integer sizes', () => {
    expect(clampFontSize(18.7)).toBe(19);
  });

  it('returns the default when the input is not a finite number', () => {
    expect(clampFontSize(Number.NaN)).toBe(DEFAULT_READER_SETTINGS.fontSize);
    expect(clampFontSize(Number.POSITIVE_INFINITY)).toBe(DEFAULT_READER_SETTINGS.fontSize);
  });
});

describe('parseReaderSettings', () => {
  it('returns defaults when input is null or undefined', () => {
    expect(parseReaderSettings(null)).toEqual(DEFAULT_READER_SETTINGS);
    expect(parseReaderSettings(undefined)).toEqual(DEFAULT_READER_SETTINGS);
  });

  it('returns defaults when input is not an object', () => {
    expect(parseReaderSettings('oops')).toEqual(DEFAULT_READER_SETTINGS);
    expect(parseReaderSettings(42)).toEqual(DEFAULT_READER_SETTINGS);
  });

  it('keeps a fully valid payload untouched', () => {
    const input = { theme: 'sepia', fontFamily: 'arial', fontSize: 22 };
    expect(parseReaderSettings(input)).toEqual(input);
  });

  it('falls back to defaults for unknown theme values', () => {
    const input = { theme: 'neon', fontFamily: 'arial', fontSize: 20 };
    expect(parseReaderSettings(input)).toEqual({
      theme: DEFAULT_READER_SETTINGS.theme,
      fontFamily: 'arial',
      fontSize: 20,
    });
  });

  it('falls back to defaults for unknown fontFamily values', () => {
    const input = { theme: 'sepia', fontFamily: 'comic-sans', fontSize: 20 };
    expect(parseReaderSettings(input)).toEqual({
      theme: 'sepia',
      fontFamily: DEFAULT_READER_SETTINGS.fontFamily,
      fontSize: 20,
    });
  });

  it('clamps out-of-range fontSize values', () => {
    expect(parseReaderSettings({ theme: 'paper', fontFamily: 'georgia', fontSize: 200 })).toEqual({
      theme: 'paper',
      fontFamily: 'georgia',
      fontSize: MAX_FONT_SIZE,
    });
  });

  it('merges partial payloads with defaults', () => {
    expect(parseReaderSettings({ fontSize: 24 })).toEqual({
      theme: DEFAULT_READER_SETTINGS.theme,
      fontFamily: DEFAULT_READER_SETTINGS.fontFamily,
      fontSize: 24,
    });
  });
});
```

- [ ] **Step 1.2: Run the tests and verify they fail**

Run: `pnpm --filter @novel/web test -- reader-settings`

Expected: FAIL — cannot import from non-existent `reader-settings.ts`.

- [ ] **Step 1.3: Implement `reader-settings.ts` to make the tests pass**

Create `apps/web/app/read/[storyId]/[chapterNumber]/reader-settings.ts`:

```ts
export type ReaderTheme = 'paper' | 'cream' | 'warm-dark' | 'pure-dark' | 'sepia';

export type ReaderFont = 'georgia' | 'arial' | 'times-new-roman' | 'courier-new';

export interface ReaderSettings {
  theme: ReaderTheme;
  fontFamily: ReaderFont;
  fontSize: number;
}

export const READER_SETTINGS_KEY = 'novel-reader-settings';

export const MIN_FONT_SIZE = 14;
export const MAX_FONT_SIZE = 28;

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  theme: 'paper',
  fontFamily: 'georgia',
  fontSize: 18,
};

export interface ThemePreset {
  id: ReaderTheme;
  label: string;
  background: string;
  text: string;
}

export const THEME_PRESETS: readonly ThemePreset[] = [
  { id: 'paper',     label: 'Paper',     background: '#fbf8f1', text: '#211f1b' },
  { id: 'cream',     label: 'Cream',     background: '#f5f0e8', text: '#2a2520' },
  { id: 'warm-dark', label: 'Warm dark', background: '#1a1510', text: '#d4c9b8' },
  { id: 'pure-dark', label: 'Pure dark', background: '#0f0f0f', text: '#cccccc' },
  { id: 'sepia',     label: 'Sepia',     background: '#f4ecd8', text: '#3b2f1e' },
] as const;

export interface FontOption {
  id: ReaderFont;
  label: string;
  stack: string;
}

export const FONT_OPTIONS: readonly FontOption[] = [
  { id: 'georgia',         label: 'Georgia',         stack: 'Georgia, "Times New Roman", serif' },
  { id: 'arial',           label: 'Arial',           stack: 'Arial, Helvetica, sans-serif' },
  { id: 'times-new-roman', label: 'Times New Roman', stack: '"Times New Roman", Times, serif' },
  { id: 'courier-new',     label: 'Courier New',     stack: '"Courier New", Courier, monospace' },
] as const;

const THEME_IDS = new Set<ReaderTheme>(THEME_PRESETS.map((t) => t.id));
const FONT_IDS = new Set<ReaderFont>(FONT_OPTIONS.map((f) => f.id));

export function clampFontSize(size: unknown): number {
  if (typeof size !== 'number' || !Number.isFinite(size)) {
    return DEFAULT_READER_SETTINGS.fontSize;
  }
  const rounded = Math.round(size);
  if (rounded < MIN_FONT_SIZE) return MIN_FONT_SIZE;
  if (rounded > MAX_FONT_SIZE) return MAX_FONT_SIZE;
  return rounded;
}

export function parseReaderSettings(raw: unknown): ReaderSettings {
  if (raw === null || typeof raw !== 'object') {
    return { ...DEFAULT_READER_SETTINGS };
  }
  const record = raw as Record<string, unknown>;
  const theme =
    typeof record.theme === 'string' && THEME_IDS.has(record.theme as ReaderTheme)
      ? (record.theme as ReaderTheme)
      : DEFAULT_READER_SETTINGS.theme;
  const fontFamily =
    typeof record.fontFamily === 'string' && FONT_IDS.has(record.fontFamily as ReaderFont)
      ? (record.fontFamily as ReaderFont)
      : DEFAULT_READER_SETTINGS.fontFamily;
  const fontSize = clampFontSize(record.fontSize);
  return { theme, fontFamily, fontSize };
}

export function getThemePreset(id: ReaderTheme): ThemePreset {
  return THEME_PRESETS.find((t) => t.id === id) ?? THEME_PRESETS[0];
}

export function getFontOption(id: ReaderFont): FontOption {
  return FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0];
}
```

- [ ] **Step 1.4: Run the tests and verify they pass**

Run: `pnpm --filter @novel/web test -- reader-settings`

Expected: PASS, all 13 tests green.

- [ ] **Step 1.5: Typecheck**

Run: `pnpm --filter @novel/web typecheck`

Expected: no errors introduced by the new files.

- [ ] **Step 1.6: Commit**

```bash
git add apps/web/app/read/\[storyId\]/\[chapterNumber\]/reader-settings.ts \
        apps/web/test/reader-settings.test.ts
git commit -m "feat(reader): add pure settings helpers with unit tests"
```

---

### Task 2: ReaderView shell — fullscreen layout and top bar

**Files:**

- Create: `apps/web/app/read/[storyId]/[chapterNumber]/ReaderView.tsx`

This task gets a minimum-viable `ReaderView` rendering: fullscreen overlay covering the admin topbar, top bar with titles, content area. No settings panel or drawer yet — those come in Tasks 4 and 5. Default settings from Task 1 are applied directly.

- [ ] **Step 2.1: Create `ReaderView.tsx` with the fullscreen shell**

```tsx
'use client';

import { useMemo } from 'react';
import type { ChapterDetail } from '@/lib/api/chapters';
import {
  DEFAULT_READER_SETTINGS,
  getFontOption,
  getThemePreset,
} from './reader-settings';

export interface ReaderViewProps {
  storyId: string;
  storyTitle: string;
  chapter: ChapterDetail;
}

export function ReaderView({ storyId, storyTitle, chapter }: ReaderViewProps) {
  const settings = DEFAULT_READER_SETTINGS;
  const theme = useMemo(() => getThemePreset(settings.theme), [settings.theme]);
  const font = useMemo(() => getFontOption(settings.fontFamily), [settings.fontFamily]);

  return (
    <div
      className="reader-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        overflowY: 'auto',
        background: theme.background,
        color: theme.text,
        fontFamily: font.stack,
      }}
    >
      <header
        className="reader-topbar"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 16px',
          background: theme.background,
          borderBottom: `1px solid ${theme.text}22`,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 2 }}>{storyTitle}</div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 16,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {chapter.title ?? `Chương ${chapter.chapterNumber}`}
          </div>
        </div>
        {/* Settings gear button added in Task 4 */}
      </header>

      <main
        style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: '24px 20px 96px',
        }}
      >
        <h1
          style={{
            fontFamily: font.stack,
            fontSize: settings.fontSize + 10,
            lineHeight: 1.25,
            margin: '8px 0 24px',
            color: theme.text,
          }}
        >
          {chapter.title ?? `Chương ${chapter.chapterNumber}`}
        </h1>
        {chapter.content ? (
          <div
            style={{
              fontSize: settings.fontSize,
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
            }}
          >
            {chapter.content}
          </div>
        ) : (
          <p style={{ opacity: 0.7 }}>Content not yet available.</p>
        )}
        {/* Prev/Next added in Task 5 */}
      </main>
      {/* Settings panel + drawer added in Tasks 4 and 5 */}
      {/* storyId intentionally used by later tasks (chapter list + prev/next) */}
      <span hidden data-story-id={storyId} />
    </div>
  );
}
```

- [ ] **Step 2.2: Typecheck**

Run: `pnpm --filter @novel/web typecheck`

Expected: no errors. `ChapterDetail` is imported from the existing `lib/api/chapters.ts`.

- [ ] **Step 2.3: Commit**

```bash
git add apps/web/app/read/\[storyId\]/\[chapterNumber\]/ReaderView.tsx
git commit -m "feat(reader): add ReaderView shell with fullscreen layout"
```

---

### Task 3: Server page that fetches chapter + story and renders `ReaderView`

**Files:**

- Create: `apps/web/app/read/[storyId]/[chapterNumber]/page.tsx`

- [ ] **Step 3.1: Create the server page**

```tsx
import type { ReactNode } from 'react';
import { apiFetch } from '@/lib/api-client';
import type { ChapterDetail } from '@/lib/api/chapters';
import { ReaderView } from './ReaderView';

interface Story {
  id: string;
  title: string;
}

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ storyId: string; chapterNumber: string }>;
}) {
  const { storyId, chapterNumber } = await params;
  const chapterNum = Number(chapterNumber);

  if (!Number.isFinite(chapterNum) || chapterNum <= 0) {
    return renderFallback('Invalid chapter number.');
  }

  let story: Story | null = null;
  let chapter: ChapterDetail | null = null;
  let error: string | null = null;

  try {
    const [storyRes, chapterRes] = await Promise.all([
      apiFetch<Story>(`/api/stories/${storyId}`),
      apiFetch<{ chapter: ChapterDetail }>(`/api/stories/${storyId}/chapters/${chapterNum}`),
    ]);
    story = storyRes;
    chapter = chapterRes.chapter;
  } catch (e) {
    error = (e as Error).message;
  }

  if (error || !story || !chapter) {
    return renderFallback(error ?? 'Chapter not found.');
  }

  return <ReaderView storyId={storyId} storyTitle={story.title} chapter={chapter} />;
}

function renderFallback(message: string): ReactNode {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: '#fbf8f1',
        color: '#211f1b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'Georgia, "Times New Roman", serif',
        textAlign: 'center',
      }}
    >
      <p>{message}</p>
    </div>
  );
}
```

- [ ] **Step 3.2: Typecheck**

Run: `pnpm --filter @novel/web typecheck`

Expected: no errors.

- [ ] **Step 3.3: Manual smoke test (dev server)**

Start API + web per repo docs, then visit:

```
http://localhost:3000/read/<existing-story-id>/1
```

Expected:

- Admin topbar is no longer visible (reader fills viewport).
- Story title shows above the chapter title in the reader top bar.
- Chapter title + body render in Paper theme / Georgia / 18px.
- Visiting a chapter with no content shows "Content not yet available."

If the API is unavailable, verify the fallback message shows without the admin topbar bleeding through.

- [ ] **Step 3.4: Commit**

```bash
git add apps/web/app/read/\[storyId\]/\[chapterNumber\]/page.tsx
git commit -m "feat(reader): add server page fetching chapter + story"
```

---

### Task 4: `useReaderSettings` hook + settings panel (theme, font, size)

**Files:**

- Modify: `apps/web/app/read/[storyId]/[chapterNumber]/ReaderView.tsx`

This task adds: the `useReaderSettings` hook (SSR-safe, reads from `localStorage` on mount, writes on every change), a gear button, and a settings panel that slides down from the top bar with theme swatches, font size slider, and font family list. Dismissed by tapping the gear again or tapping the backdrop.

- [ ] **Step 4.1: Add the `useReaderSettings` hook at the top of `ReaderView.tsx`**

Replace the `const settings = DEFAULT_READER_SETTINGS;` line introduced in Task 2 with a proper hook. Insert above the `ReaderView` component:

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_READER_SETTINGS,
  FONT_OPTIONS,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  READER_SETTINGS_KEY,
  THEME_PRESETS,
  getFontOption,
  getThemePreset,
  parseReaderSettings,
  type ReaderFont,
  type ReaderSettings,
  type ReaderTheme,
} from './reader-settings';

function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_READER_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(READER_SETTINGS_KEY);
      if (raw) {
        setSettings(parseReaderSettings(JSON.parse(raw)));
      }
    } catch {
      // ignore parse / storage errors, fall back to defaults
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(READER_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // quota or private-mode errors are non-fatal
    }
  }, [hydrated, settings]);

  const setTheme = useCallback((theme: ReaderTheme) => {
    setSettings((s) => ({ ...s, theme }));
  }, []);
  const setFontFamily = useCallback((fontFamily: ReaderFont) => {
    setSettings((s) => ({ ...s, fontFamily }));
  }, []);
  const setFontSize = useCallback((fontSize: number) => {
    setSettings((s) => ({ ...s, fontSize }));
  }, []);

  return { settings, setTheme, setFontFamily, setFontSize };
}
```

Update the `ReaderView` body to use the hook:

```tsx
const { settings, setTheme, setFontFamily, setFontSize } = useReaderSettings();
const [settingsOpen, setSettingsOpen] = useState(false);
const theme = useMemo(() => getThemePreset(settings.theme), [settings.theme]);
const font = useMemo(() => getFontOption(settings.fontFamily), [settings.fontFamily]);
```

- [ ] **Step 4.2: Add the gear button to the top bar**

Replace the `{/* Settings gear button added in Task 4 */}` comment with:

```tsx
<button
  type="button"
  aria-label="Reader settings"
  aria-expanded={settingsOpen}
  onClick={() => setSettingsOpen((open) => !open)}
  style={{
    background: 'transparent',
    border: `1px solid ${theme.text}33`,
    borderRadius: 999,
    color: theme.text,
    minWidth: 44,
    minHeight: 44,
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  }}
>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
</button>
```

- [ ] **Step 4.3: Add the settings panel + backdrop below the top bar**

Replace the `{/* Settings panel + drawer added in Tasks 4 and 5 */}` comment with:

```tsx
{settingsOpen && (
  <>
    <button
      type="button"
      aria-label="Close settings"
      onClick={() => setSettingsOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3,
        background: 'rgba(0, 0, 0, 0.15)',
        border: 0,
        padding: 0,
      }}
    />
    <div
      role="dialog"
      aria-label="Reader settings"
      style={{
        position: 'absolute',
        top: 64,
        left: 12,
        right: 12,
        zIndex: 4,
        background: theme.background,
        color: theme.text,
        border: `1px solid ${theme.text}33`,
        borderRadius: 12,
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.18)',
        padding: 16,
        display: 'grid',
        gap: 16,
      }}
    >
      {/* Theme swatches */}
      <section>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Background</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {THEME_PRESETS.map((preset) => {
            const active = preset.id === settings.theme;
            return (
              <button
                key={preset.id}
                type="button"
                aria-label={preset.label}
                aria-pressed={active}
                onClick={() => setTheme(preset.id)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  border: active ? `2px solid ${theme.text}` : `1px solid ${theme.text}33`,
                  background: preset.background,
                  color: preset.text,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                {active ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {/* Font size slider */}
      <section>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Font size</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14 }}>A</span>
          <input
            type="range"
            min={MIN_FONT_SIZE}
            max={MAX_FONT_SIZE}
            step={1}
            value={settings.fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            aria-label="Font size"
            style={{ flex: 1, accentColor: theme.text }}
          />
          <span style={{ fontSize: 22 }}>A</span>
        </div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{settings.fontSize}px</div>
      </section>

      {/* Font family list */}
      <section>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Font</div>
        <div style={{ display: 'grid', gap: 6 }}>
          {FONT_OPTIONS.map((option) => {
            const active = option.id === settings.fontFamily;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFontFamily(option.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 44,
                  padding: '8px 12px',
                  background: active ? `${theme.text}11` : 'transparent',
                  color: theme.text,
                  border: `1px solid ${theme.text}22`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: option.stack,
                  fontSize: 16,
                }}
              >
                <span>{option.label}</span>
                {active ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {/* Chapter list button — wired up in Task 5 */}
      <button
        type="button"
        onClick={() => {
          setSettingsOpen(false);
          setDrawerOpen(true);
        }}
        style={{
          minHeight: 44,
          padding: '10px 14px',
          background: 'transparent',
          color: theme.text,
          border: `1px solid ${theme.text}33`,
          borderRadius: 8,
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Chapter list
      </button>
    </div>
  </>
)}
```

The `setDrawerOpen` referenced above is added in Task 5; leave the reference in place — the compiler will error until Task 5 is merged. If that is unacceptable, temporarily wire the button to `() => setSettingsOpen(false)` and update in Task 5.

- [ ] **Step 4.4: Quick local pre-check before Task 5**

To avoid leaving the branch with a broken typecheck between Tasks 4 and 5, add a stub drawer state right now at the top of `ReaderView`, directly under the existing `useState` calls:

```tsx
const [drawerOpen, setDrawerOpen] = useState(false);
```

This is harmless; Task 5 will render the drawer.

- [ ] **Step 4.5: Typecheck**

Run: `pnpm --filter @novel/web typecheck`

Expected: no errors.

- [ ] **Step 4.6: Manual smoke test**

Visit a reader page, open the gear:

- All 5 theme swatches show; tapping one changes background + text instantly.
- Font size slider changes only the body text size (title still scales via the `+10` offset).
- Font family list swaps the font for both title and body.
- Closing via gear or backdrop both work.
- Reload page — chosen settings persist.

- [ ] **Step 4.7: Commit**

```bash
git add apps/web/app/read/\[storyId\]/\[chapterNumber\]/ReaderView.tsx
git commit -m "feat(reader): add settings hook and panel (theme, font, size)"
```

---

### Task 5: Chapter drawer + prev/next navigation

**Files:**

- Modify: `apps/web/app/read/[storyId]/[chapterNumber]/ReaderView.tsx`

This task: fetches `ChapterSummary[]` on mount, renders a bottom-sheet drawer triggered by the "Chapter list" button, and adds prev/next links below the content based on sorted chapter numbers.

- [ ] **Step 5.1: Add client-side chapter list loading**

Add at the top of `ReaderView.tsx` (below the other imports):

```tsx
import Link from 'next/link';
import { fetchChapters, type ChapterSummary } from '@/lib/api/chapters';
```

Inside `ReaderView`, after the settings hook wiring, add:

```tsx
const [chapters, setChapters] = useState<ChapterSummary[]>([]);

useEffect(() => {
  let cancelled = false;
  fetchChapters(storyId)
    .then((list) => {
      if (cancelled) return;
      const sorted = [...list].sort((a, b) => a.chapterNumber - b.chapterNumber);
      setChapters(sorted);
    })
    .catch(() => {
      // Drawer + prev/next simply stay empty on failure. Reader content still renders.
    });
  return () => {
    cancelled = true;
  };
}, [storyId]);

const currentIndex = chapters.findIndex((c) => c.chapterNumber === chapter.chapterNumber);
const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
const nextChapter =
  currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;
```

- [ ] **Step 5.2: Add prev/next nav under the content**

Inside the `<main>` element, directly below the content block, add:

```tsx
<nav
  aria-label="Chapter navigation"
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 48,
    paddingTop: 16,
    borderTop: `1px solid ${theme.text}22`,
  }}
>
  {prevChapter ? (
    <Link
      href={`/read/${storyId}/${prevChapter.chapterNumber}`}
      style={{ color: theme.text, fontWeight: 600, minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
    >
      ← Previous
    </Link>
  ) : (
    <span />
  )}
  {nextChapter ? (
    <Link
      href={`/read/${storyId}/${nextChapter.chapterNumber}`}
      style={{ color: theme.text, fontWeight: 600, minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
    >
      Next →
    </Link>
  ) : (
    <span />
  )}
</nav>
```

- [ ] **Step 5.3: Add the chapter drawer (bottom sheet)**

Replace the stub — just before the closing `</div>` of `.reader-root` — add:

```tsx
{drawerOpen && (
  <>
    <button
      type="button"
      aria-label="Close chapter list"
      onClick={() => setDrawerOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 5,
        background: 'rgba(0, 0, 0, 0.35)',
        border: 0,
        padding: 0,
      }}
    />
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chapter list"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 6,
        maxHeight: '80vh',
        background: theme.background,
        color: theme.text,
        borderTop: `1px solid ${theme.text}33`,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        boxShadow: '0 -16px 40px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: `1px solid ${theme.text}22`,
        }}
      >
        <strong>Chapters</strong>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close"
          style={{
            minWidth: 44,
            minHeight: 44,
            background: 'transparent',
            border: 0,
            color: theme.text,
            fontSize: 20,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>
      <div style={{ overflowY: 'auto', padding: 8 }}>
        {chapters.length === 0 ? (
          <p style={{ padding: 16, opacity: 0.7 }}>No chapters available yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
            {chapters.map((c) => {
              const active = c.chapterNumber === chapter.chapterNumber;
              return (
                <li key={c.id}>
                  <Link
                    href={`/read/${storyId}/${c.chapterNumber}`}
                    onClick={() => setDrawerOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 14px',
                      minHeight: 44,
                      borderRadius: 8,
                      color: theme.text,
                      background: active ? `${theme.text}14` : 'transparent',
                      fontWeight: active ? 700 : 500,
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.chapterNumber}. {c.title ?? `Chương ${c.chapterNumber}`}
                    </span>
                    {active ? <span aria-hidden="true">●</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  </>
)}
```

You can now remove the placeholder `<span hidden data-story-id={storyId} />` element introduced in Task 2 — `storyId` is now referenced in real code.

- [ ] **Step 5.4: Typecheck**

Run: `pnpm --filter @novel/web typecheck`

Expected: no errors.

- [ ] **Step 5.5: Run the full test suite for the web app**

Run: `pnpm --filter @novel/web test`

Expected: all tests still pass, including `reader-settings` (13 tests) and `model-settings-state` (1 test).

- [ ] **Step 5.6: Manual smoke test**

- With at least 3 chapters in a story, open `/read/<story>/2`.
- "Chapter list" opens a bottom drawer. Tapping the current chapter row shows the active highlight.
- Tapping another chapter navigates to its reader page; the drawer closes.
- Prev button is hidden on chapter 1, Next button is hidden on the last chapter.
- Tapping the backdrop closes the drawer.
- Re-check that settings still persist across navigation.

- [ ] **Step 5.7: Commit**

```bash
git add apps/web/app/read/\[storyId\]/\[chapterNumber\]/ReaderView.tsx
git commit -m "feat(reader): add chapter drawer and prev/next navigation"
```

---

### Task 6: Add a "Read" link on the existing chapter admin page

**Files:**

- Modify: `apps/web/app/stories/[id]/chapters/[chapterNumber]/page.tsx`

Add a small anchor — no logic changes, no component changes — so users can jump from the studio view to the reader.

- [ ] **Step 6.1: Inspect the current header**

Re-read `apps/web/app/stories/[id]/chapters/[chapterNumber]/page.tsx` around the `studio-header` block to ensure the insertion site lines up.

- [ ] **Step 6.2: Insert the Read link next to the title meta-line**

Replace this block:

```tsx
<header className="studio-header">
  <div>
    <p className="studio-kicker">Chapter {chapter.chapterNumber}</p>
    <h1>{chapter.title ?? `Ch. ${chapter.chapterNumber}`}</h1>
    <p className="meta-line">
      <span className="status-pill">{chapter.status}</span>
      <span>{chapter.wordCount} words</span>
      <span>Validation: {chapter.validationStatus}</span>
      <span>Packet: {chapter.packetAuditStatus}</span>
    </p>
  </div>
  {canRetry && (
    <RegenerateButton
      storyId={id}
      chapterNumber={chapter.chapterNumber}
    />
  )}
</header>
```

with:

```tsx
<header className="studio-header">
  <div>
    <p className="studio-kicker">Chapter {chapter.chapterNumber}</p>
    <h1>{chapter.title ?? `Ch. ${chapter.chapterNumber}`}</h1>
    <p className="meta-line">
      <span className="status-pill">{chapter.status}</span>
      <span>{chapter.wordCount} words</span>
      <span>Validation: {chapter.validationStatus}</span>
      <span>Packet: {chapter.packetAuditStatus}</span>
    </p>
  </div>
  <div className="studio-actions">
    <a
      href={`/read/${id}/${chapter.chapterNumber}`}
      className="nav-link"
      style={{ fontWeight: 700 }}
    >
      Read →
    </a>
    {canRetry && (
      <RegenerateButton
        storyId={id}
        chapterNumber={chapter.chapterNumber}
      />
    )}
  </div>
</header>
```

Rationale: `.studio-actions` is an existing class in `globals.css` that provides a flex row with gap — no new CSS needed.

- [ ] **Step 6.3: Typecheck**

Run: `pnpm --filter @novel/web typecheck`

Expected: no errors.

- [ ] **Step 6.4: Manual smoke test**

- Open the existing chapter admin page: `/stories/<id>/chapters/1`.
- The "Read →" link appears alongside the regenerate button.
- Clicking it navigates to `/read/<id>/1` and opens the reader.

- [ ] **Step 6.5: Commit**

```bash
git add apps/web/app/stories/\[id\]/chapters/\[chapterNumber\]/page.tsx
git commit -m "feat(reader): link from chapter admin page to reader view"
```

---

### Task 7: Final verification

**Files:** none (verification only)

- [ ] **Step 7.1: Full typecheck + tests**

Run:

```bash
pnpm --filter @novel/web typecheck
pnpm --filter @novel/web test
```

Expected: both green. Vitest runs at least 14 tests (1 existing + 13 new reader-settings tests).

- [ ] **Step 7.2: Mobile-viewport QA (Chrome DevTools, iPhone 12 preset, 390×844)**

Verify on the reader page:

1. Admin topbar is not visible.
2. Gear button hit target ≥ 44×44.
3. Settings panel fits within viewport; all swatches, slider, and font rows are reachable with the thumb.
4. Chapter drawer opens from the bottom, max height ~80vh, scrollable.
5. Body text reflows inside `max-width: 680px` centered.
6. `localStorage` key `novel-reader-settings` is written/updated as settings change (check Application tab).
7. All five themes work; dark themes produce legible body + controls (border colors use `text-color + alpha` so they adapt).
8. Navigating prev → next preserves theme, font, and size.

- [ ] **Step 7.3: Edge cases**

1. Visit `/read/<id>/99999` (non-existent) — fallback "Chapter not found." renders with no admin chrome.
2. Visit `/read/<bogus-uuid>/1` — fallback with the API error message; no admin chrome.
3. Open a chapter whose `content` is `null` — reader still renders, "Content not yet available." shows in the content area.
4. Open reader in a private browsing mode that blocks `localStorage` — app does not crash, defaults are used on every page load.

- [ ] **Step 7.4: Tag the completed work (optional)**

If the project uses a PR workflow, push the branch and open a PR referencing `docs/superpowers/specs/2026-05-01-reader-ui-design.md`. Otherwise, no further commits are needed.

---

## Self-Review Notes

- **Spec coverage check:**
  - Routes & Files ✓ (Tasks 2, 3, 6)
  - Reader settings (fonts, font size slider, 5 themes, localStorage persistence) ✓ (Tasks 1, 4)
  - Top bar layout ✓ (Task 2)
  - Settings panel ✓ (Task 4)
  - Content area (max-width 680, line-height 1.8, "Content not yet available") ✓ (Tasks 2, 5)
  - Chapter drawer ✓ (Task 5)
  - Prev/Next nav ✓ (Task 5)
  - Data fetching (apiFetch server-side + fetchChapters client-side) ✓ (Tasks 3, 5)
  - Constraints (mobile-first ≥44px targets, no API changes, no new deps) ✓ (Tasks 4, 5, 7)

- **Placeholder scan:** No "TBD", no "add appropriate X", every step shows the code it requires.

- **Type consistency:** `ReaderSettings`, `ReaderTheme`, `ReaderFont` are defined in Task 1 and used unchanged in Tasks 2, 4, 5. `ChapterSummary` / `ChapterDetail` are imported from the existing `lib/api/chapters.ts` and not redefined.

- **Known minor order-of-operations detail:** Task 4 references `setDrawerOpen` used by Task 5. Step 4.4 adds the stub `useState` up front, so each task commits to a compiling tree.
