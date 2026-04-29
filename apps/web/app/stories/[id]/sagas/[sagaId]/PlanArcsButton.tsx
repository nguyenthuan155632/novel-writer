'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { planArcs } from '@/lib/api/arcs';

export function PlanArcsButton({
  storyId,
  sagaId,
  defaultCurrentState,
}: {
  storyId: string;
  sagaId: string;
  defaultCurrentState: string;
}) {
  const router = useRouter();
  const [currentState, setCurrentState] = useState(defaultCurrentState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePlanArcs() {
    if (!confirm('This calls the Pro model to plan arcs for this saga. Continue?')) return;

    setLoading(true);
    setError(null);
    try {
      await planArcs(storyId, sagaId, currentState.trim() || defaultCurrentState);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border rounded p-3 mt-4">
      <label className="block text-sm font-medium mb-1">Current state for Arc Planner</label>
      <textarea
        className="w-full border rounded p-2 text-sm"
        rows={4}
        value={currentState}
        onChange={(e) => setCurrentState(e.target.value)}
      />
      <button
        className="rounded bg-purple-600 px-4 py-2 text-white disabled:opacity-50 mt-2"
        type="button"
        disabled={loading}
        onClick={handlePlanArcs}
      >
        {loading ? 'Planning arcs...' : 'Plan arcs (Pro)'}
      </button>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
