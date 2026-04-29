import { describe, expect, it } from 'vitest';
import { compactCharacter, compactThread, compactSeed, compactSummary, compactFact } from '../../src/context/compact.js';

describe('compactCharacter', () => {
  it('maps full character to compact form', () => {
    const result = compactCharacter({
      id: 'c1',
      name: 'Linh',
      currentRealm: 'kim đan',
      status: 'alive',
      currentBloodlines: ['Hỏa Long', 'Phượng Hoàng'],
      faction: 'Thiên Môn',
      shortTraits: ['dũng cảm', 'thông minh', 'nóng tính', 'trung thành', 'đa nghi', '额外'],
    });
    expect(result).toEqual({
      id: 'c1',
      name: 'Linh',
      currentRealm: 'kim đan',
      status: 'alive',
      bloodlines: ['Hỏa Long', 'Phượng Hoàng'],
      faction: 'Thiên Môn',
      shortTraits: ['dũng cảm', 'thông minh', 'nóng tính', 'trung thành', 'đa nghi'],
    });
  });

  it('handles null optional fields', () => {
    const result = compactCharacter({
      id: 'c2',
      name: 'Minh',
      currentRealm: null,
      status: 'unknown_status',
      currentBloodlines: null,
      faction: null,
      shortTraits: null,
    });
    expect(result.currentRealm).toBeUndefined();
    expect(result.status).toBe('unknown');
    expect(result.bloodlines).toEqual([]);
    expect(result.shortTraits).toEqual([]);
  });

  it('strips optional fields when stripOptional is true', () => {
    const result = compactCharacter({
      id: 'c3',
      name: 'Test',
      currentRealm: 'trúc cơ',
      status: 'alive',
      currentBloodlines: [],
      faction: ' Faction',
      shortTraits: [],
    }, { stripOptional: true });
    expect(result.currentRealm).toBeUndefined();
    expect(result.faction).toBeUndefined();
  });

  it('limits shortTraits to 5 items', () => {
    const result = compactCharacter({
      id: 'c4',
      name: 'Test',
      status: 'alive',
      currentBloodlines: [],
      shortTraits: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    });
    expect(result.shortTraits).toHaveLength(5);
  });
});

describe('compactThread', () => {
  it('maps thread fields correctly', () => {
    const result = compactThread({
      id: 't1',
      title: 'Mystery of the sword',
      status: 'open',
      openedChapter: 10,
      plannedResolutionChapter: 50,
    });
    expect(result).toEqual({
      id: 't1',
      title: 'Mystery of the sword',
      state: 'open',
      introducedChapter: 10,
      plannedResolutionChapter: 50,
    });
  });

  it('defaults unknown status to open', () => {
    const result = compactThread({
      id: 't2',
      title: 'Unknown thread',
      status: 'unknown_status',
      openedChapter: null,
      plannedResolutionChapter: null,
    });
    expect(result.state).toBe('open');
    expect(result.introducedChapter).toBe(0);
    expect(result.plannedResolutionChapter).toBeUndefined();
  });

  it('maps partial and resolved states', () => {
    expect(compactThread({ id: 'a', title: '', status: 'partial', openedChapter: 1, plannedResolutionChapter: null }).state).toBe('partial');
    expect(compactThread({ id: 'b', title: '', status: 'resolved', openedChapter: 1, plannedResolutionChapter: null }).state).toBe('resolved');
  });
});

describe('compactSeed', () => {
  it('maps seed fields correctly', () => {
    const result = compactSeed({
      id: 's1',
      seedText: 'Mysterious herb',
      payoffDescription: 'Heals fatal wound',
      plantWindowStart: 5,
      plantWindowEnd: 20,
      payoffChapter: 25,
      status: 'planted',
    });
    expect(result).toEqual({
      id: 's1',
      seedText: 'Mysterious herb',
      payoffDescription: 'Heals fatal wound',
      plantWindowStart: 5,
      plantWindowEnd: 20,
      payoffChapter: 25,
      status: 'planted',
    });
  });

  it('defaults unknown status to pending and null payoffChapter to undefined', () => {
    const result = compactSeed({
      id: 's2',
      seedText: 'test',
      payoffDescription: 'test',
      plantWindowStart: 1,
      plantWindowEnd: 10,
      payoffChapter: null,
      status: 'weird',
    });
    expect(result.status).toBe('pending');
    expect(result.payoffChapter).toBeUndefined();
  });
});

describe('compactSummary', () => {
  it('maps chapter summary', () => {
    const result = compactSummary({ chapterNumber: 5, shortSummary: 'Hero fights dragon' });
    expect(result).toEqual({ chapterNumber: 5, shortSummary: 'Hero fights dragon' });
  });
});

describe('compactFact', () => {
  it('maps canon fact', () => {
    const result = compactFact({ id: 'f1', importance: 'high', fact: 'Sword is cursed' });
    expect(result).toEqual({ id: 'f1', importance: 'high', fact: 'Sword is cursed' });
  });
});
