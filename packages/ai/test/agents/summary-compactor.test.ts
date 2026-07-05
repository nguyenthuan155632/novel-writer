import { describe, expect, it } from 'vitest';
import { SummaryCompactor, BibleCompactionTooLargeError, normalizeSummaryCompactorPayload } from '../../src/agents/summary-compactor.ts';
import { MockProvider } from '../../src/providers/mock.ts';
import type { Logger } from '../../src/agents/summary-compactor.ts';
import '../../src/prompts/summary-compactor.v2.ts';

const silentLogger: Logger = {
  child: () => silentLogger,
  error: () => {},
  info: () => {},
  warn: () => {},
};

const VALID_SUMMARY_OUTPUT = JSON.stringify({
  summary: 'Trong chương này, Lam Trach đối mặt với thử thách Hỏa Long. Sau một trận chiến cam go, anh hấp thu tinh hoa và đột phá nguyên anh. Đồng thời, bí ẩn về huyết mạch được hé lộ.',
  keyEvents: ['Lam Trach đột phá nguyên anh', 'Hỏa Long tinh bị hấp thu'],
  charactersPresent: ['Lam Trach', 'Sư phụ'],
  moodShift: 'lighter',
});

// Generates a summary that exceeds 500 tokens (uses natural text to avoid BPE compression of repetitive chars)
function makeOversizedSummary(): string {
  // ~500+ tokens: natural prose at ~1.3 tokens/word, repeated to ensure > 500 tokens regardless of tokenizer.
  const sentence = 'Lam Trach tu luyện không biết mệt mỏi trong hang sâu, ngày qua ngày đêm qua đêm, ';
  const longSummary = sentence.repeat(50); // ~3500 chars, ~500+ tokens on any tokenizer
  return JSON.stringify({
    summary: longSummary,
    keyEvents: ['event'],
    charactersPresent: ['char'],
  });
}

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

  it('normalizes observed schema drift from summary compactor output', async () => {
    const payload = normalizeSummaryCompactorPayload({
      keyEvents: [
        'Lâm Dạ học cách kiểm soát huyết mạch.',
        { description: 'Ngọc bội kích hoạt Thủy Nguyên Thần Tích.' },
      ],
      charactersPresent: ['Lâm Dạ', 'Lâm Thanh Phong'],
      moodShift: 'từ hài hước sang căng thẳng rồi hy vọng',
    }) as {
      summary?: string;
      keyEvents?: string[];
      charactersPresent?: string[];
      moodShift?: string;
    };

    expect(payload.summary).toContain('Lâm Dạ học cách kiểm soát huyết mạch.');
    expect(payload.keyEvents).toEqual([
      'Lâm Dạ học cách kiểm soát huyết mạch.',
      'Ngọc bội kích hoạt Thủy Nguyên Thần Tích.',
    ]);
    expect(payload.charactersPresent).toEqual(['Lâm Dạ', 'Lâm Thanh Phong']);
    expect(payload.moodShift).toBeUndefined();
  });

  it('normalizes nullable moodShift from first-chapter summaries', async () => {
    const payload = normalizeSummaryCompactorPayload({
      summary: 'Lâm Dạ bị kéo vào đại sảnh sau khi vô tình đột phá.',
      keyEvents: ['Lâm Dạ bị hiểu lầm là thiên tài giấu nghề.'],
      charactersPresent: ['Lâm Dạ'],
      moodShift: null,
    }) as { moodShift?: string };

    expect(payload.moodShift).toBeUndefined();
  });

  it('compacts output when the provider omits summary but returns key events', async () => {
    const provider = new MockProvider({
      responder: {
        kind: 'fixed',
        content: JSON.stringify({
          keyEvents: ['Lâm Dạ kích hoạt ngọc bội.', 'Thủy Nguyên Ấn bị đẩy lui.'],
          charactersPresent: ['Lâm Dạ'],
          moodShift: 'từ hài hước sang căng thẳng rồi hy vọng',
        }),
      },
    });
    const compactor = new SummaryCompactor({ provider, logger: silentLogger });
    const r = await compactor.compact({
      chapterNumber: 8,
      chapterContent: 'Content',
      previousSummary: 'Prev',
      bibleCompact: 'Bible',
    }, { traceId: 't', storyId: 's' });

    expect(r.output.summary).toContain('Lâm Dạ kích hoạt ngọc bội.');
    expect(r.output.keyEvents).toHaveLength(2);
    expect(r.output.moodShift).toBeUndefined();
  });

  it('§1.11 retries with stricter prompt when summary exceeds 500 tokens', async () => {
    let callCount = 0;
    const provider = new MockProvider({
      responder: {
        kind: 'fn',
        fn: () => {
          callCount++;
          const content = callCount === 1 ? makeOversizedSummary() : VALID_SUMMARY_OUTPUT;
          return {
            content,
            usage: { inputTokens: 100, outputTokens: 50, cachedInputTokens: 0 },
            finishReason: 'stop' as const,
            raw: {},
          };
        },
      },
    });
    const compactor = new SummaryCompactor({ provider, logger: silentLogger });
    const r = await compactor.compact({
      chapterNumber: 5,
      chapterContent: 'Content',
      previousSummary: 'Prev',
      bibleCompact: 'Bible',
    }, { traceId: 't', storyId: 's' });

    expect(callCount).toBe(2);
    expect(r.output.summary).toBeTruthy();
    expect(r.output.summary.length).toBeLessThan(700); // short summary from VALID_SUMMARY_OUTPUT
  });

  it('§1.11 throws BibleCompactionTooLargeError when both attempts produce oversized summary', async () => {
    const provider = new MockProvider({
      responder: { kind: 'fixed', content: makeOversizedSummary() },
    });
    const compactor = new SummaryCompactor({ provider, logger: silentLogger });
    await expect(
      compactor.compact({
        chapterNumber: 5,
        chapterContent: 'Content',
        previousSummary: 'Prev',
        bibleCompact: 'Bible',
      }, { traceId: 't', storyId: 's' }),
    ).rejects.toThrow(BibleCompactionTooLargeError);
  });
});
