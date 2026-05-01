import { describe, it, expect } from 'vitest';
import { findGenre, findPersonality } from '@novel/core';
import { packetGeneratorPromptV2 } from '../../src/prompts/packet-generator.v2.ts';

describe('packetGeneratorPromptV2', () => {
  it('system prompt embeds genre + personality + storyOptions blocks', () => {
    const built = packetGeneratorPromptV2.build({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [], duePlantedSeeds: [],
      overdueThreads: [], forbiddenRules: 'no harem', chapterNumber: 1, arcGoals: 'g',
      genreDef: findGenre('cao_vo'),
      personalityDef: findPersonality('overbearing_decisive'),
      storyOptions: { tone: 'serious' },
    });
    expect(built.system).toContain('GENRE CONTRACT');
    expect(built.system).toContain('Cao võ');
    expect(built.system).toContain('PERSONALITY CONTRACT');
    expect(built.system).toContain('Bá đạo, quyết đoán');
    expect(built.system).toContain('Tone: Nghiêm túc');
  });
});
