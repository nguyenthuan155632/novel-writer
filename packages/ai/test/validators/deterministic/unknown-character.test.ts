import { describe, it, expect } from 'vitest';
import { unknownCharacterCheck } from '../../../src/validators/deterministic/unknown-character.ts';
import type { CheckInput } from '../../../src/validators/deterministic/types.ts';

function makeInput(content: string, knownCharacters: string[] = []): CheckInput {
  return {
    content,
    context: {
      hot: { systemRules: '', bibleCompact: '', styleGuide: '', powerRules: '', styleFewShots: [] },
      warm: { sagaSummary: '', arcSummary: '', activeCharacters: [], arcOpenThreads: [], arcPlantedSeeds: [] },
      cold: { recentSummaries: [], retrievedFacts: [], retrievedPastChapters: [], seedsToPlantNow: [], packet: {} as any },
      meta: { storyId: 's1', chapterNumber: 1, arcId: 'a1', hotHash: '', warmHash: '', targetInputBudget: 6000 },
    },
    chapter: { chapterNumber: 1 },
    story: { id: 's1' },
    canon: {
      deadCharacterNames: [],
      knownCharacterNames: knownCharacters,
      knownLocationNames: [],
      knownBloodlineNames: [],
      lockedFacts: [],
      realmByCharacter: {},
    },
  };
}

describe('unknownCharacterCheck', () => {
  it('passes when all characters are known', () => {
    const result = unknownCharacterCheck.run(makeInput('Lam Trach bước vào phòng.', ['Lam Trach']));
    expect(result.pass).toBe(true);
  });

  it('flags unknown characters', () => {
    const result = unknownCharacterCheck.run(makeInput('Trần Minh nhìn Vương Phong đi xa.', ['Trần Minh']));
    expect(result.pass).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});