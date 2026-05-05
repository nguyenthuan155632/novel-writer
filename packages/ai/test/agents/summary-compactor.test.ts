import { describe, expect, it } from 'vitest';
import { SummaryCompactor, BibleCompactionTooLargeError } from '../../src/agents/summary-compactor.ts';
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

// Generates a summary that exceeds 500 tokens (~1600+ chars at 3.2 chars/token)
function makeOversizedSummary(): string {
  const longSummary = 'x'.repeat(1700);
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
