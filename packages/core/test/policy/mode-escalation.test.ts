import { describe, it, expect } from 'vitest';
import { resolveEffectiveMode, type ModeEscalationDeps } from '../../src/policy/mode-escalation.ts';

const noOpDeps: ModeEscalationDeps = {
  getArcBoundaryForChapter: async () => null,
  hasBlockingPendingUpdates: async () => false,
};

describe('resolveEffectiveMode', () => {
  it('keeps safe mode untouched', async () => {
    const r = await resolveEffectiveMode({ storyId: 's', chapterNumber: 5, userMode: 'safe' }, noOpDeps);
    expect(r.mode).toBe('safe');
    expect(r.reasons).toHaveLength(0);
  });

  it('escalates first chapter', async () => {
    const r = await resolveEffectiveMode({ storyId: 's', chapterNumber: 1, userMode: 'semi_auto' }, noOpDeps);
    expect(r.mode).toBe('safe');
    expect(r.reasons).toContain('first_chapter');
  });

  it('escalates at arc end', async () => {
    const deps: ModeEscalationDeps = {
      getArcBoundaryForChapter: async () => ({ startChapter: 1, endChapter: 20 }),
      hasBlockingPendingUpdates: async () => false,
    };
    const r = await resolveEffectiveMode({ storyId: 's', chapterNumber: 20, userMode: 'semi_auto' }, deps);
    expect(r.mode).toBe('safe');
    expect(r.reasons).toContain('arc_end');
  });

  it('does not escalate in normal chapter', async () => {
    const deps: ModeEscalationDeps = {
      getArcBoundaryForChapter: async () => ({ startChapter: 1, endChapter: 20 }),
      hasBlockingPendingUpdates: async () => false,
    };
    const r = await resolveEffectiveMode({ storyId: 's', chapterNumber: 10, userMode: 'semi_auto' }, deps);
    expect(r.mode).toBe('semi_auto');
    expect(r.reasons).toHaveLength(0);
  });

  it('escalates with blocking pending updates', async () => {
    const deps: ModeEscalationDeps = {
      getArcBoundaryForChapter: async () => null,
      hasBlockingPendingUpdates: async () => true,
    };
    const r = await resolveEffectiveMode({ storyId: 's', chapterNumber: 5, userMode: 'full_auto' }, deps);
    expect(r.mode).toBe('safe');
    expect(r.reasons).toContain('blocking_pending');
  });
});