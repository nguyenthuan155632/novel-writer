import { describe, it, expect } from 'vitest';
import { ArcSummaryCompactorAgent } from '../../src/agents/arc-summary-compactor.ts';
import { MockProvider } from '../../src/providers/mock.ts';
import type { Logger } from '../../src/agents/packet-generator.ts';
import '../../src/prompts/arc-summary-compactor.v2.ts';

const silentLogger: Logger = { child: () => silentLogger, error: () => {}, info: () => {} };

describe('ArcSummaryCompactorAgent.compact', () => {
  it('returns trimmed text and usage', async () => {
    const provider = new MockProvider({ responder: { kind: 'fixed', content: '  arc summary text  ' } });
    const agent = new ArcSummaryCompactorAgent({ provider, logger: silentLogger });
    const r = await agent.compact({ storyId: 's', arcTitle: 'Arc 1', perChapterSummaries: [{ chapterNumber: 1, summary: 'sum' }] });
    expect(r.summary).toBe('arc summary text');
  });

  it('uses the injected model route', async () => {
    const provider = new MockProvider({ responder: { kind: 'fixed', content: 'arc summary text' } });
    const agent = new ArcSummaryCompactorAgent({ provider, logger: silentLogger, model: 'gemma4:e4b' });

    await agent.compact({ storyId: 's', arcTitle: 'Arc 1', perChapterSummaries: [{ chapterNumber: 1, summary: 'sum' }] });

    expect(provider.getCalls()[0]!.model).toBe('gemma4:e4b');
  });

  it('removes first-person compactor process notes from the returned summary', async () => {
    const provider = new MockProvider({
      responder: {
        kind: 'fixed',
        content: [
          'Người dùng yêu cầu tôi, với tư cách biên tập tóm lược arc, viết lại bản tóm tắt arc hợp nhất.',
          'Tôi cần giữ mọi sự kiện liên quan đến seeds/locked facts. Trả về plain text, không markdown.',
          'Lộ Nhàn và Vân Yên đến Cựu Địa Đồ, phát hiện dấu ấn là bẫy và tiếp tục truy tìm Mặc Lộ Đạo.',
          'Tôi th',
        ].join('\n\n'),
      },
    });
    const agent = new ArcSummaryCompactorAgent({ provider, logger: silentLogger });

    const r = await agent.compact({
      storyId: 's',
      arcTitle: 'Arc 1',
      perChapterSummaries: [{ chapterNumber: 1, summary: 'sum' }],
    });

    expect(r.summary).toBe('Lộ Nhàn và Vân Yên đến Cựu Địa Đồ, phát hiện dấu ấn là bẫy và tiếp tục truy tìm Mặc Lộ Đạo.');
  });
});
