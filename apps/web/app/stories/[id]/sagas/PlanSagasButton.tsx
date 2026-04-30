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
          if (!confirm('This calls the Pro model. Continue?')) return;
          setLoading(true);
          setError(null);
          try {
            await planSagas(storyId, { resetSeeds: true });
            router.refresh();
          } catch (e: any) { setError(e.message); }
          finally { setLoading(false); }
        }}
        className="primary"
      >
        {loading ? 'Planning…' : 'Plan sagas'}
      </button>
      {error && <span className="error" style={{ marginLeft: 8 }}>{error}</span>}
    </div>
  );
}
