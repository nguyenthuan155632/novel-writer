import { describe, it, expect } from 'vitest';
import { shouldRunReviewer } from '../../src/policy/high-stakes-triggers.ts';

describe('shouldRunReviewer', () => {
  it('runs on critical or high severity regardless of position', () => {
    const critical = shouldRunReviewer({ chapterNumber: 5, arcEndChapter: 20, worstValidatorSeverity: 'critical' });
    expect(critical.run).toBe(true);
    expect(critical.reason).toBe('critical_severity');

    const high = shouldRunReviewer({ chapterNumber: 5, arcEndChapter: 20, worstValidatorSeverity: 'high' });
    expect(high.run).toBe(true);
    expect(high.reason).toBe('critical_severity');
  });

  it('runs on packet high-stakes flag', () => {
    const r = shouldRunReviewer({
      chapterNumber: 5,
      arcEndChapter: 20,
      worstValidatorSeverity: 'low',
      packetHighStakes: true,
    });
    expect(r).toEqual({ run: true, reason: 'packet_high_stakes' });
  });

  it('runs on arc climax phase', () => {
    const r = shouldRunReviewer({
      chapterNumber: 5,
      arcEndChapter: 20,
      worstValidatorSeverity: 'low',
      arcPhase: 'climax',
    });
    expect(r).toEqual({ run: true, reason: 'arc_climax' });
  });

  it('runs at arc boundary when feature enabled', () => {
    const atStart = shouldRunReviewer({
      chapterNumber: 11,
      arcStartChapter: 11,
      arcEndChapter: 20,
      worstValidatorSeverity: 'low',
    });
    expect(atStart).toEqual({ run: true, reason: 'arc_boundary' });

    const atEnd = shouldRunReviewer({
      chapterNumber: 20,
      arcStartChapter: 11,
      arcEndChapter: 20,
      worstValidatorSeverity: 'low',
    });
    expect(atEnd).toEqual({ run: true, reason: 'arc_boundary' });
  });

  it('runs on breakthrough or death keywords', () => {
    const r = shouldRunReviewer({
      chapterNumber: 5,
      arcEndChapter: 20,
      worstValidatorSeverity: 'low',
      requiredEventTexts: ['Lam Trạch đột phá cảnh giới ngay trước đại chiến'],
    });
    expect(r).toEqual({ run: true, reason: 'breakthrough_or_death' });
  });

  it('skips otherwise', () => {
    expect(
      shouldRunReviewer({ chapterNumber: 5, arcEndChapter: 20, worstValidatorSeverity: 'low' }).run,
    ).toBe(false);
  });
});