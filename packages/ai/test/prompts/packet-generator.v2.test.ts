import { describe, it, expect } from 'vitest';
import { findGenre, findPersonality } from '@novel/core';
import { packetGeneratorPromptV2 } from '../../src/prompts/packet-generator.v2.ts';

describe('packetGeneratorPromptV2', () => {
  it('§1.9 injects must_include_seeds block when seeds approaching deadline', () => {
    const built = packetGeneratorPromptV2.build({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [], duePlantedSeeds: [],
      overdueThreads: [], forbiddenRules: '', chapterNumber: 10, arcGoals: 'g',
      mustIncludeSeeds: [{ id: 'seed-abc', seedText: 'bí mật huyết mạch', plantWindowEnd: 11 }],
      genreDef: findGenre('tien_hiep'),
      personalityDef: findPersonality('cunning_pragmatic'),
      storyOptions: {},
    });
    expect(built.user).toContain('<must_include_seeds priority="critical">');
    expect(built.user).toContain('seedId="seed-abc"');
    expect(built.user).toContain('bí mật huyết mạch');
    expect(built.user).toContain('plantWindowEnd=ch11');
  });

  it('no must_include_seeds block when none provided', () => {
    const built = packetGeneratorPromptV2.build({
      bibleCompact: 'b', arcSummary: 'a', recentChapterSummaries: [],
      activeCharacters: [], openThreads: [], duePlantedSeeds: [],
      overdueThreads: [], forbiddenRules: '', chapterNumber: 1, arcGoals: 'g',
      genreDef: findGenre('tien_hiep'),
      personalityDef: findPersonality('cunning_pragmatic'),
      storyOptions: {},
    });
    expect(built.user).not.toContain('must_include_seeds');
  });

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
