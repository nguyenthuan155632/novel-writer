import { describe, it, expect } from 'vitest';
import { checkAgainstCaps } from '../../src/policy/budget-guardrails.ts';

describe('checkAgainstCaps', () => {
  it('returns ok well below thresholds', () => {
    expect(checkAgainstCaps({ dailyUsd: 1, monthlyUsd: 5 }).state).toBe('ok');
  });
  it('alerts at 80% daily', () => {
    expect(checkAgainstCaps({ dailyUsd: 4.0, monthlyUsd: 5 }).state).toBe('alert');
  });
  it('breaches above daily cap', () => {
    expect(checkAgainstCaps({ dailyUsd: 5.5, monthlyUsd: 5 }).state).toBe('breach');
  });
});