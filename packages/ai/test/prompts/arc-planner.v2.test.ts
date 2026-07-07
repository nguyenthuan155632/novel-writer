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

  it('guides first arcs toward natural long-serial openings instead of immediate chase plotting', () => {
    const built = arcPlannerPromptV2.build({
      sagaStart: 1, sagaEnd: 40, sagaLength: 40,
      sagaTitle: 'Saga mở đầu',
      sagaPremise: 'Một người giữ đèn phát hiện thị trấn có điều lạ.',
      turningPoints: ['Đèn tắt bất thường vào đêm đầu tiên'],
      currentState: 'init',
      unresolvedSeeds: [],
      genreDef: findGenre('dong_phuong_huyen_bi'),
      storyOptions: { pacing: 'slow' },
    });
    expect(built.system).toContain('nhịp sống bình thường');
    expect(built.system).toContain('25-40% đầu của arc mở đầu');
    expect(built.system).toContain('không phải cảnh mở màn liên tục kéo nhân vật chạy');
    expect(built.system).toContain('KHÔNG biến mọi expectedChanges thành sự kiện giật gân');
  });
});
