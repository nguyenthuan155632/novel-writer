import { describe, expect, it } from 'vitest';
import { QUEUE_NAMES } from '../src/queues.js';

describe('queues', () => {
  it('exposes stable queue names', () => {
    expect(QUEUE_NAMES.generateChapter).toBe('generate-chapter');
    expect(QUEUE_NAMES.refreshArcSummary).toBe('refresh-arc-summary');
  });
});