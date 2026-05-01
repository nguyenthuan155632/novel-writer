import { describe, it, expect } from 'vitest';
import { styleRedFlagsCheck } from '../../../src/validators/deterministic/style-red-flags.ts';
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

describe('styleRedFlagsCheck', () => {
  it('passes for clean content', () => {
    const result = styleRedFlagsCheck.run(makeInput('Lam Trach luyện kiếm một cách kiên trì.'));
    expect(result.pass).toBe(true);
  });

  it('flags English red-flag patterns', () => {
    const result = styleRedFlagsCheck.run(makeInput('He leveled up and the system notified him.'));
    expect(result.pass).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('flags Vietnamese red-flag patterns', () => {
    const result = styleRedFlagsCheck.run(makeInput('Hệ thống thông báo: đột phá thành công.'));
    expect(result.pass).toBe(false);
  });
});