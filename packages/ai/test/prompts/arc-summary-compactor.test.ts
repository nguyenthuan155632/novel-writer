import { describe, it, expect } from 'vitest';
import { arcSummaryCompactorPromptV2 } from '../../src/prompts/arc-summary-compactor.v2.ts';

describe('arcSummaryCompactorPromptV2', () => {
  it('includes the previous rolling summary block when provided', () => {
    const built = arcSummaryCompactorPromptV2.build({
      arcTitle: 'Arc Huyết Nguyệt',
      previousRollingSummary: 'Lam Trạch đột phá Trúc Cơ.',
      perChapterSummaries: [{ chapterNumber: 61, summary: 'Đại chiến mở màn' }],
    });
    expect(built.user).toContain('TÓM TẮT ARC HIỆN TẠI');
    expect(built.user).toContain('Lam Trạch đột phá Trúc Cơ.');
    expect(built.user).toContain('Ch 61: Đại chiến mở màn');
  });
  it('omits the block when absent', () => {
    const built = arcSummaryCompactorPromptV2.build({
      arcTitle: 'Arc Huyết Nguyệt',
      perChapterSummaries: [{ chapterNumber: 1, summary: 'Khởi đầu' }],
    });
    expect(built.user).not.toContain('TÓM TẮT ARC HIỆN TẠI');
  });
});
