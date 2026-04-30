'use client';

import { useState } from 'react';
import { downloadExport, type ExportFormat } from '@/lib/api/exports';

export function ExportButtons({ storyId }: { storyId: string }) {
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(format: ExportFormat) {
    setLoading(format);
    setError(null);
    try {
      await downloadExport(storyId, format);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="button-row">
      <button
        onClick={() => handleExport('markdown')}
        disabled={loading !== null}
        style={{ cursor: loading !== null ? 'not-allowed' : 'pointer' }}
      >
        {loading === 'markdown' ? 'Exporting…' : 'Export Markdown'}
      </button>
      <button
        onClick={() => handleExport('epub')}
        disabled={loading !== null}
        style={{ cursor: loading !== null ? 'not-allowed' : 'pointer' }}
      >
        {loading === 'epub' ? 'Exporting…' : 'Export EPUB'}
      </button>
      {error && <span className="error">{error}</span>}
    </div>
  );
}
