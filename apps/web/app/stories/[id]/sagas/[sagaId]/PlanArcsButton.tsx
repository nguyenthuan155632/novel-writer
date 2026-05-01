"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { planArcs } from "@/lib/api/arcs";

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
    setLoading(true);
    setError(null);
    try {
      await planArcs(
        storyId,
        sagaId,
        currentState.trim() || defaultCurrentState,
      );
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="studio-panel">
      <div className="field-group">
        <label>Current state for Arc Planner</label>
        <textarea
          rows={15}
          value={currentState}
          onChange={(e) => setCurrentState(e.target.value)}
        />
      </div>
      <button
        className="primary"
        type="button"
        disabled={loading}
        onClick={handlePlanArcs}
        style={{ marginTop: 15 }}
      >
        {loading ? "Planning arcs..." : "Plan arcs"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
