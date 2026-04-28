import { describe, it, expect } from 'vitest';
import { buildChecks, runDeterministicValidator } from '../../../src/validators/deterministic/runner.ts';
import type { CheckInput } from '../../../src/validators/deterministic/types.ts';

function makeInput(overrides: Partial<CheckInput> = {}): CheckInput {
  return {
    content: Array(2000).fill('word').join(' ') + ' Đột nhiên một bóng hình xuất hiện. Anh ta chiến đấu。',
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
    ...overrides,
  };
}

describe('buildChecks', () => {
  it('returns all checks sorted by severity', () => {
    const checks = buildChecks('');
    expect(checks.length).toBe(12);
    expect(checks[0]!.severity).toBe('critical');
    expect(checks[checks.length - 1]!.severity).toBe('low');
  });
});

describe('runDeterministicValidator', () => {
  it('passes for valid content', () => {
    const checks = buildChecks('');
    const result = runDeterministicValidator(makeInput(), checks);
    expect(result.pass).toBe(true);
    expect(result.shortCircuited).toBe(false);
  });

  it('short-circuits on critical severity failure', () => {
    const checks = buildChecks('');
    const input = makeInput({
      content: 'Minh Đức bước vào rừng.',
      canon: {
        deadCharacterNames: ['Minh Đức'],
        knownCharacterNames: [],
        knownLocationNames: [],
        knownBloodlineNames: [],
        lockedFacts: [],
        realmByCharacter: {},
      },
    });
    const result = runDeterministicValidator(input, checks);
    expect(result.pass).toBe(false);
    expect(result.shortCircuited).toBe(true);
  });

  it('reports all issues when no critical failure', () => {
    const checks = buildChecks('');
    const input = makeInput({
      content: 'Nội dung không có xung đột.',
      canon: {
        deadCharacterNames: [],
        knownCharacterNames: [],
        knownLocationNames: [],
        knownBloodlineNames: [],
        lockedFacts: [],
        realmByCharacter: {},
      },
    });
    const result = runDeterministicValidator(input, checks);
    expect(result.pass).toBe(false);
    expect(result.shortCircuited).toBe(false);
  });
});