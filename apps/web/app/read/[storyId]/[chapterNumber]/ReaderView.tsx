'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChapterDetail } from '@/lib/api/chapters';
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

export interface ReaderViewProps {
  storyId: string;
  storyTitle: string;
  chapter: ChapterDetail;
}

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

export function ReaderView({ storyId, storyTitle, chapter }: ReaderViewProps) {
  const { settings, setTheme, setFontFamily, setFontSize } = useReaderSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const theme = useMemo(() => getThemePreset(settings.theme), [settings.theme]);
  const font = useMemo(() => getFontOption(settings.fontFamily), [settings.fontFamily]);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1-.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </button>
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
                  style={{ flex: 1, accentColor: theme.text } as React.CSSProperties}
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

            {/* Chapter list button */}
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
      {/* storyId intentionally used by later tasks (chapter list + prev/next) */}
      <span hidden data-story-id={storyId} />
      {/* drawerOpen used by chapter list drawer in Task 5 */}
      <span hidden data-drawer-open={String(drawerOpen)} />
    </div>
  );
}
