import { describe, it, expect } from 'vitest';
import { realmJumpCheck } from '../../../src/validators/deterministic/realm-jump.ts';
import type { CheckInput } from '../../../src/validators/deterministic/types.ts';

function makeInput(content: string, realmByCharacter: Record<string, string | undefined> = {}): CheckInput {
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
      realmByCharacter,
    },
  };
}

describe('realmJumpCheck', () => {
  it('passes when no breakthroughs in content', () => {
    const result = realmJumpCheck.run(makeInput('Lam Trach luyện kiếm trong rừng.'));
    expect(result.pass).toBe(true);
  });

  it('fails when multiple breakthroughs detected', () => {
    const result = realmJumpCheck.run(makeInput(
      'Lam Trach đột phá cảnh giới luyện khí. Sau đó, anh lại đột phá lần nữa.',
      { 'Lam Trach': 'phàm nhân' },
    ));
    expect(result.pass).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});