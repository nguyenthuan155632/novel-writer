import { describe, expect, it, vi } from 'vitest';
import {
  getMetricCount,
  incrementMetric,
  METRIC_NAMES,
  recordStaleJobResets,
  resetMetrics,
} from '../../src/services/metrics.js';

describe('worker metrics', () => {
  it('increments generic counters', () => {
    resetMetrics();
    incrementMetric(METRIC_NAMES.slotBasedChaptersTotal);
    incrementMetric(METRIC_NAMES.slotBasedChaptersTotal, 2);
    expect(getMetricCount(METRIC_NAMES.slotBasedChaptersTotal)).toBe(3);
  });

  it('records stale reset totals and warns at threshold', () => {
    resetMetrics();
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
    };

    recordStaleJobResets(2, logger);
    expect(getMetricCount(METRIC_NAMES.staleJobsResetTotal)).toBe(2);
    expect(logger.warn).not.toHaveBeenCalled();

    recordStaleJobResets(1, logger);
    expect(getMetricCount(METRIC_NAMES.staleJobsResetTotal)).toBe(3);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
