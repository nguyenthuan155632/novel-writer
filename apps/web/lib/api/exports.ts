const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

export type ExportFormat = 'markdown' | 'epub';

export async function downloadExport(storyId: string, format: ExportFormat): Promise<void> {
  const res = await fetch(`${BASE}/api/stories/${storyId}/exports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format }),
  });

  if (res.status === 202) {
    alert('Your story is large — the export has been queued. Check back later to download it.');
    return;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`Export failed (${res.status}): ${body}`);
  }

  const blob = await res.blob();
  const cd = res.headers.get('content-disposition') ?? '';
  const m = cd.match(/filename="([^"]+)"/);
  const filename = m ? m[1] : `story.${format === 'markdown' ? 'md' : 'epub'}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
