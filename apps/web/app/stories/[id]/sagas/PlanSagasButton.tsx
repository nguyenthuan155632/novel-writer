'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { planSagas } from '@/lib/api/sagas';

export function PlanSagasButton({ storyId }: { storyId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div>
      <button
        disabled={loading}
        onClick={async () => {
          if (!confirm('This calls the Pro model and costs ~$0.04. Continue?')) return;
          setLoading(true);
          setError(null);
          try {
            await planSagas(storyId);
            router.refresh();
          } catch (e: any) { setError(e.message); }
          finally { setLoading(false); }
        }}
        className="rounded bg-purple-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? 'Planning…' : 'Plan sagas (Pro)'}
      </button>
      {error && <span className="ml-2 text-red-600 text-sm">{error}</span>}
    </div>
  );
}