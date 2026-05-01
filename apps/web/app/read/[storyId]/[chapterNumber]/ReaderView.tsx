'use client';

import { useMemo, useState } from 'react';
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  void drawerOpen;

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
