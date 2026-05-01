import { describe, expect, it } from 'vitest';
import { SummaryCompactorOutputSchema } from '../../src/schemas/summary.ts';

describe('SummaryCompactorOutputSchema', () => {
  it('parses valid output', () => {
    const data = {
      summary: 'Tóm tắt chi tiết dài hơn',
      keyEvents: ['Sự kiện 1', 'Sự kiện 2'],
      charactersPresent: ['Lam Trach'],
    };
    const result = SummaryCompactorOutputSchema.parse(data);
    expect(result.summary).toBe('Tóm tắt chi tiết dài hơn');
    expect(result.moodShift).toBeUndefined();
  });

  it('accepts moodShift', () => {
    const data = {
      summary: 'B',
      keyEvents: [],
      charactersPresent: [],
      moodShift: 'darker',
    };
    const result = SummaryCompactorOutputSchema.parse(data);
    expect(result.moodShift).toBe('darker');
  });

  it('rejects missing required fields', () => {
    expect(() => SummaryCompactorOutputSchema.parse({ summary: 'A' })).toThrow();
  });

  it('truncates overlong summary from the model', () => {
    const longSummary = 'y'.repeat(2500);
    const result = SummaryCompactorOutputSchema.parse({
      summary: longSummary,
      keyEvents: ['ok'],
      charactersPresent: ['A'],
    });
    expect(result.summary.length).toBeLessThanOrEqual(2000);
    expect(result.summary.endsWith('…')).toBe(true);
  });
});
