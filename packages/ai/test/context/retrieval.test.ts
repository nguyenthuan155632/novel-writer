import { describe, expect, it } from 'vitest';
import { getStoryBible, getSagaForChapter, getArcForChapter, getArcById, getActiveCharacters, getOpenThreadsForStory, getPlantedSeedsForStory, getSeedsDueForChapter, getRecentSummaries, getPastChapterSummaries } from '../../src/context/retrieval.js';
import { compactCharacter, compactThread, compactSeed, compactSummary } from '../../src/context/compact.js';

describe('getStoryBible (unit)', () => {
  it('exports getStoryBible as a function', () => {
    expect(typeof getStoryBible).toBe('function');
  });
});

describe('getSagaForChapter (unit)', () => {
  it('exports getSagaForChapter as a function', () => {
    expect(typeof getSagaForChapter).toBe('function');
  });
});

describe('getArcForChapter (unit)', () => {
  it('exports getArcForChapter as a function', () => {
    expect(typeof getArcForChapter).toBe('function');
  });
});

describe('getArcById (unit)', () => {
  it('exports getArcById as a function', () => {
    expect(typeof getArcById).toBe('function');
  });
});

describe('getActiveCharacters (unit)', () => {
  it('exports getActiveCharacters as a function', () => {
    expect(typeof getActiveCharacters).toBe('function');
  });
});

describe('getOpenThreadsForStory (unit)', () => {
  it('exports getOpenThreadsForStory as a function', () => {
    expect(typeof getOpenThreadsForStory).toBe('function');
  });
});

describe('getPlantedSeedsForStory (unit)', () => {
  it('exports getPlantedSeedsForStory as a function', () => {
    expect(typeof getPlantedSeedsForStory).toBe('function');
  });
});

describe('getSeedsDueForChapter (unit)', () => {
  it('exports getSeedsDueForChapter as a function', () => {
    expect(typeof getSeedsDueForChapter).toBe('function');
  });
});

describe('getRecentSummaries (unit)', () => {
  it('exports getRecentSummaries as a function', () => {
    expect(typeof getRecentSummaries).toBe('function');
  });
});

describe('getPastChapterSummaries (unit)', () => {
  it('exports getPastChapterSummaries as a function', () => {
    expect(typeof getPastChapterSummaries).toBe('function');
  });
});