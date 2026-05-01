import { describe, it, expect } from 'vitest';
import { makeForbiddenMoveCheck } from '../../../src/validators/deterministic/forbidden-move.ts';
import type { CheckInput } from '../../../src/validators/deterministic/types.ts';

function makeInput(content: string): CheckInput {
  return {
    content,
    context: {
      hot: { systemRules: '', bibleCompact: '', styleGuide: '', powerSystem: '', powerSystemKind: '', genreContract: '', personalityContract: '', storyOptionsBlock: '', styleFewShots: [] },
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

describe('makeForbiddenMoveCheck', () => {
  it('passes when no forbidden rules are violated', () => {
    const check = makeForbiddenMoveCheck('Không cho phép resurrection\nKhông cho phép time travel');
    const result = check.run(makeInput('Lam Trach luyện kiếm.'));
    expect(result.pass).toBe(true);
  });

  it('fails when content contains forbidden rule text', () => {
    const check = makeForbiddenMoveCheck('Không cho phép resurrection\nKhông cho phép time travel');
    const result = check.run(makeInput('Nhân vật sử dụng resurrection phép thuật.'));
    expect(result.pass).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});