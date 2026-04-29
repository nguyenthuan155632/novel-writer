import { describe, it, expect } from 'vitest';
import { HighStakesReviewSchema } from '../../src/schemas/high-stakes-review.ts';

describe('HighStakesReviewSchema', () => {
  it('accepts minimal approval', () => {
    const r = HighStakesReviewSchema.safeParse({ approve: true, concerns: [], recommendedActions: [] });
    expect(r.success).toBe(true);
  });
  it('rejects unknown action', () => {
    const r = HighStakesReviewSchema.safeParse({
      approve: false,
      concerns: [{ category: 'plot', severity: 'high', description: 'x'.repeat(20) }],
      recommendedActions: [{ action: 'something_invalid', rationale: 'x'.repeat(20) }],
    });
    expect(r.success).toBe(false);
  });
});