import { describe, it, expect } from 'vitest';
import { cliffhangerCheck } from '../../../src/validators/deterministic/cliffhanger.ts';
import type { CheckInput } from '../../../src/validators/deterministic/types.ts';

function makeInput(content: string): CheckInput {
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
      knownCharacterNames: [],
      knownLocationNames: [],
      knownBloodlineNames: [],
      lockedFacts: [],
      realmByCharacter: {},
    },
  };
}

describe('cliffhangerCheck', () => {
  it('passes when cliffhanger indicators are present', () => {
    const content = Array(2000).fill('word').join(' ') + '\n\nĐột nhiên, một bóng hình xuất hiện phía trước.';
    const result = cliffhangerCheck.run(makeInput(content));
    expect(result.pass).toBe(true);
  });

  it('flags when no cliffhanger indicators found', () => {
    const content = Array(2000).fill('word').join(' ') + '\n\nMọi thứ yên bình trở lại.';
    const result = cliffhangerCheck.run(makeInput(content));
    expect(result.pass).toBe(false);
  });
});