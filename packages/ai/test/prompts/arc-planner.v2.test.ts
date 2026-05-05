import { describe, it, expect } from 'vitest';
import { findGenre } from '@novel/core';
import { arcPlannerPromptV2 } from '../../src/prompts/arc-planner.v2.ts';

describe('arcPlannerPromptV2', () => {
  it('embeds genre contract and avoids tien hiep wording for di_nang', () => {
    const built = arcPlannerPromptV2.build({
      sagaStart: 1, sagaEnd: 100, sagaLength: 100,
      sagaTitle: 'Saga 1', sagaPremise: 'p', turningPoints: [],
      currentState: 'init', unresolvedSeeds: [],
      genreDef: findGenre('di_nang'), storyOptions: {},
    });
    expect(built.system.toLowerCase()).not.toContain('tiên hiệp');
    expect(built.system).toContain('Dị năng');
  });

  it('adds planner frame on system side', () => {
    const built = arcPlannerPromptV2.build({
      sagaStart: 1, sagaEnd: 100, sagaLength: 100,
      sagaTitle: 'Saga 1', sagaPremise: 'p', turningPoints: [],
      currentState: 'init', unresolvedSeeds: [],
      genreDef: findGenre('di_nang'), storyOptions: {},
    });
    expect(built.system).toContain('<planner_frame>');
    expect(built.system).toContain('Suy nghĩ nội bộ trước, sau đó mới xuất JSON cuối cùng');
  });
});
