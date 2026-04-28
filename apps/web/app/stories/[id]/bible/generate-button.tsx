'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';

export function GenerateButton({ storyId }: { storyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    if (!confirm('Generate Bible bây giờ? Việc này sẽ gọi OpenRouter và tốn API credits.')) return;
    setLoading(true);
    setErr(null);
    try {
      await apiFetch(`/api/stories/${storyId}/bible`, { method: 'POST' });
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="primary" onClick={go} disabled={loading}>
        {loading ? 'Đang generate...' : 'Generate Bible'}
      </button>
      {err && <p className="error">{err}</p>}
    </div>
  );
}