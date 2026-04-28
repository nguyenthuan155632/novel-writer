import { describe, it, expect } from 'vitest';
import { conflictPresenceCheck } from '../../../src/validators/deterministic/conflict-presence.ts';
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

describe('conflictPresenceCheck', () => {
  it('passes when conflict keywords are present', () => {
    const result = conflictPresenceCheck.run(makeInput('Lam Trach chiến đấu với kẻ thù.'));
    expect(result.pass).toBe(true);
  });

  it('fails when no conflict keywords found', () => {
    const result = conflictPresenceCheck.run(makeInput('Lam Trach ngồi thiền dưới gốc cây.'));
    expect(result.pass).toBe(false);
    expect(result.issues[0]).toContain('xung đột');
  });
});