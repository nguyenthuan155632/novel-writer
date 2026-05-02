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

  it('drops invalid UUID placeholders from threadUpdates and seeds', () => {
    const valid = '11111111-1111-1111-1111-111111111111';
    const data = {
      characterUpdates: [{ action: 'create' as const, name: 'X', fields: {}, targetId: 'not-a-uuid' }],
      newCanonFacts: [],
      threadUpdates: [
        { action: 'update' as const, title: 'T1', targetId: 'unknown-id-from-model' },
        { action: 'create' as const, title: 'T2', targetId: valid },
      ],
      newTimelineEvents: [],
      seedsResolvedThisChapter: ['bad', valid],
    };
    const result = ExtractorOutputSchema.parse(data);
    expect(result.characterUpdates[0]!.targetId).toBeUndefined();
    expect(result.threadUpdates[0]!.targetId).toBeUndefined();
    expect(result.threadUpdates[1]!.targetId).toBe(valid);
    expect(result.seedsResolvedThisChapter).toEqual([valid]);
  });

  it('treats plannedResolutionChapter 0 as absent (model placeholder)', () => {
    const data = {
      characterUpdates: [],
      newCanonFacts: [],
      threadUpdates: [
        { action: 'update' as const, title: 'T', plannedResolutionChapter: 0 },
      ],
      newTimelineEvents: [],
      seedsResolvedThisChapter: [],
    };
    const result = ExtractorOutputSchema.parse(data);
    expect(result.threadUpdates[0]!.plannedResolutionChapter).toBeUndefined();
  });

  it('keeps positive plannedResolutionChapter', () => {
    const data = {
      characterUpdates: [],
      newCanonFacts: [],
      threadUpdates: [{ action: 'update' as const, title: 'T', plannedResolutionChapter: 12 }],
      newTimelineEvents: [],
      seedsResolvedThisChapter: [],
    };
    const result = ExtractorOutputSchema.parse(data);
    expect(result.threadUpdates[0]!.plannedResolutionChapter).toBe(12);
  });

  it('defaults factionUpdates to [] when omitted (backward compat with v2 prompts)', () => {
    const data = {
      characterUpdates: [],
      newCanonFacts: [],
      threadUpdates: [],
      newTimelineEvents: [],
      seedsResolvedThisChapter: [],
    };
    const result = ExtractorOutputSchema.parse(data);
    expect(result.factionUpdates).toEqual([]);
  });

  it('parses factionUpdates create + update with status enum', () => {
    const data = {
      characterUpdates: [],
      newCanonFacts: [],
      threadUpdates: [],
      newTimelineEvents: [],
      factionUpdates: [
        { action: 'create', name: 'Thiên Kiếm Môn', fields: { type: 'sect', powerLevel: 'top-tier' } },
        { action: 'update', targetId: '99999999-9999-9999-9999-999999999999', name: 'Hắc Phong Trại', fields: { status: 'destroyed' } },
      ],
      seedsResolvedThisChapter: [],
    };
    const result = ExtractorOutputSchema.parse(data);
    expect(result.factionUpdates).toHaveLength(2);
    expect(result.factionUpdates[0]!.fields.type).toBe('sect');
    expect(result.factionUpdates[1]!.fields.status).toBe('destroyed');
  });

  it('rejects factionUpdates with invalid status enum', () => {
    const data = {
      characterUpdates: [],
      newCanonFacts: [],
      threadUpdates: [],
      newTimelineEvents: [],
      factionUpdates: [{ action: 'update', name: 'X', fields: { status: 'imploded' } }],
      seedsResolvedThisChapter: [],
    };
    expect(() => ExtractorOutputSchema.parse(data)).toThrow();
  });

  it('drops bad targetId placeholder on faction updates', () => {
    const data = {
      characterUpdates: [],
      newCanonFacts: [],
      threadUpdates: [],
      newTimelineEvents: [],
      factionUpdates: [{ action: 'update', name: 'X', fields: { status: 'active' }, targetId: 'not-a-uuid' }],
      seedsResolvedThisChapter: [],
    };
    const result = ExtractorOutputSchema.parse(data);
    expect(result.factionUpdates[0]!.targetId).toBeUndefined();
  });
});
