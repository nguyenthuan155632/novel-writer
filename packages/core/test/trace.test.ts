import { describe, it, expect } from 'vitest';
import { withTrace, getTraceId, newTraceId } from '../src/trace.ts';

describe('trace context', () => {
  it('returns undefined outside withTrace', () => {
    expect(getTraceId()).toBeUndefined();
  });

  it('returns the trace id inside withTrace', () => {
    const id = newTraceId();
    withTrace({ traceId: id }, () => {
      expect(getTraceId()).toBe(id);
    });
  });

  it('isolates traces across siblings', async () => {
    const id1 = newTraceId();
    const id2 = newTraceId();
    const r1 = withTrace({ traceId: id1 }, async () => getTraceId());
    const r2 = withTrace({ traceId: id2 }, async () => getTraceId());
    expect(await r1).toBe(id1);
    expect(await r2).toBe(id2);
  });
});