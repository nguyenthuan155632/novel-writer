export type TurningPointStatus = {
  index: number;
  text: string;
  state: 'done' | 'overdue' | 'current' | 'upcoming';
};

/**
 * State-based pacing: a TP is done only when the extractor confirmed it.
 * The uniform chapter-position milestone (legacy heuristic) only decides
 * whether an incomplete TP is overdue vs upcoming.
 */
export function computeTurningPointStatuses(input: {
  turningPoints: string[];
  completedIndices: number[];
  sagaPosition: number;
  sagaSpan: number;
}): TurningPointStatus[] {
  const { turningPoints, completedIndices, sagaPosition, sagaSpan } = input;
  const done = new Set(completedIndices);
  const span = Math.max(1, sagaSpan);
  const milestoneIdx = Math.min(
    turningPoints.length - 1,
    Math.max(0, Math.floor((sagaPosition - 1) / (span / turningPoints.length))),
  );
  // current = first incomplete TP at or after the milestone; incomplete TPs before it are overdue
  let currentIdx = -1;
  for (let i = milestoneIdx; i < turningPoints.length; i++) {
    if (!done.has(i)) { currentIdx = i; break; }
  }
  if (currentIdx === -1) {
    // everything from milestone onward is done; current = first incomplete anywhere (may be -1)
    currentIdx = turningPoints.findIndex((_, i) => !done.has(i));
  }
  return turningPoints.map((text, index) => {
    if (done.has(index)) return { index, text, state: 'done' as const };
    if (index === currentIdx) return { index, text, state: index < milestoneIdx ? ('overdue' as const) : ('current' as const) };
    return { index, text, state: index < milestoneIdx ? ('overdue' as const) : ('upcoming' as const) };
  });
}
