import { describe, expect, it } from 'vitest';
import { SummaryCompactorOutputSchema } from '../../src/schemas/summary.ts';

describe('SummaryCompactorOutputSchema', () => {
  it('parses valid output', () => {
    const data = {
      shortSummary: 'Tóm tắt ngắn',
      detailedSummary: 'Tóm tắt chi tiết dài hơn',
      keyEvents: ['Sự kiện 1', 'Sự kiện 2'],
      charactersPresent: ['Lam Trach'],
    };
    const result = SummaryCompactorOutputSchema.parse(data);
    expect(result.shortSummary).toBe('Tóm tắt ngắn');
    expect(result.moodShift).toBeUndefined();
  });

  it('accepts moodShift', () => {
    const data = {
      shortSummary: 'A',
      detailedSummary: 'B',
      keyEvents: [],
      charactersPresent: [],
      moodShift: 'darker',
    };
    const result = SummaryCompactorOutputSchema.parse(data);
    expect(result.moodShift).toBe('darker');
  });

  it('rejects missing required fields', () => {
    expect(() => SummaryCompactorOutputSchema.parse({ shortSummary: 'A' })).toThrow();
  });
});
