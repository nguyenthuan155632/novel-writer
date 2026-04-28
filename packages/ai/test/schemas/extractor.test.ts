import { describe, expect, it } from 'vitest';
import { ExtractorOutputSchema } from '../../src/schemas/extractor.ts';

describe('ExtractorOutputSchema', () => {
  it('parses valid extractor output', () => {
    const data = {
      characterUpdates: [{
        action: 'create',
        name: 'Lam Trach',
        fields: { currentRealm: 'kim đan', status: 'alive' },
      }],
      newCanonFacts: [{
        topic: 'Huyết mạch',
        fact: 'Hỏa Long huyết mạch',
        importance: 'high',
      }],
      threadUpdates: [{
        action: 'create',
        title: 'Bí ẩn',
        state: 'open',
      }],
      newTimelineEvents: [{
        description: 'Sự kiện',
        significance: 'major',
      }],
      seedsResolvedThisChapter: [],
    };
    const result = ExtractorOutputSchema.parse(data);
    expect(result.characterUpdates).toHaveLength(1);
    expect(result.newCanonFacts[0]!.topic).toBe('Huyết mạch');
  });

  it('rejects invalid action', () => {
    const data = {
      characterUpdates: [{ action: 'delete', name: 'X', fields: {} }],
      newCanonFacts: [],
      threadUpdates: [],
      newTimelineEvents: [],
      seedsResolvedThisChapter: [],
    };
    expect(() => ExtractorOutputSchema.parse(data)).toThrow();
  });

  it('defaults significance to minor', () => {
    const data = {
      characterUpdates: [],
      newCanonFacts: [],
      threadUpdates: [],
      newTimelineEvents: [{ description: 'Sự kiện nhỏ' }],
      seedsResolvedThisChapter: [],
    };
    const result = ExtractorOutputSchema.parse(data);
    expect(result.newTimelineEvents[0]!.significance).toBe('minor');
  });
});
