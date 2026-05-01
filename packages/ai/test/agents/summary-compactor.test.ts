import { describe, expect, it } from 'vitest';
import { SummaryCompactor } from '../../src/agents/summary-compactor.ts';
import { MockProvider } from '../../src/providers/mock.ts';
import type { Logger } from '../../src/agents/summary-compactor.ts';
import '../../src/prompts/summary-compactor.v2.ts';

const silentLogger: Logger = {
  child: () => silentLogger,
  error: () => {},
  info: () => {},
};

const VALID_SUMMARY_OUTPUT = JSON.stringify({
  summary: 'Trong chương này, Lam Trach đối mặt với thử thách Hỏa Long. Sau một trận chiến cam go, anh hấp thu tinh hoa và đột phá nguyên anh. Đồng thời, bí ẩn về huyết mạch được hé lộ.',
  keyEvents: ['Lam Trach đột phá nguyên anh', 'Hỏa Long tinh bị hấp thu'],
  charactersPresent: ['Lam Trach', 'Sư phụ'],
  moodShift: 'lighter',
});

describe('SummaryCompactor', () => {
  it('parses valid mocked JSON output', async () => {
    const provider = new MockProvider({
      responder: { kind: 'fixed', content: VALID_SUMMARY_OUTPUT },
    });
    const compactor = new SummaryCompactor({ provider, logger: silentLogger });
    const r = await compactor.compact({
      chapterNumber: 5,
      chapterContent: 'Nội dung chương dài...',
      previousSummary: 'Ch4: Lam Trach luyện công.',
      bibleCompact: 'Bible compact',
    }, { traceId: 't', storyId: 's' });

    expect(r.output.summary).toBeTruthy();
    expect(r.output.keyEvents).toHaveLength(2);
    expect(r.output.charactersPresent).toHaveLength(2);
    expect(r.output.moodShift).toBe('lighter');
    expect(r.promptVersion).toBe('v2');
  });

  it('throws on schema-invalid JSON', async () => {
    const provider = new MockProvider({
      responder: { kind: 'fixed', content: '{"summary":"ok"}' },
    });
    const compactor = new SummaryCompactor({ provider, logger: silentLogger });
    await expect(compactor.compact({
      chapterNumber: 5,
      chapterContent: 'Content',
      previousSummary: 'Prev',
      bibleCompact: 'Bible',
    }, { traceId: 't', storyId: 's' })).rejects.toThrow();
  });
});
