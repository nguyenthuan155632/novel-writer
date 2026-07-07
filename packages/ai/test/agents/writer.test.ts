import { describe, it, expect, afterEach } from 'vitest';
import { modelFor, resetModelRoutesForTests, setModelRoutes } from '@novel/core';
import { WriterAgent, parseTitleAndContent } from '../../src/agents/writer.ts';
import { MockProvider } from '../../src/providers/mock.ts';
import '../../src/prompts/writer.v2.ts';

afterEach(() => {
  resetModelRoutesForTests();
});

describe('parseTitleAndContent', () => {
  it('parses TITLE: prefix format', () => {
    const result = parseTitleAndContent('TITLE: Chương 1\n\nNội dung chương...');
    expect(result.title).toBe('Chương 1');
    expect(result.content).toBe('Nội dung chương...');
  });

  it('parses TITLE: with extra whitespace', () => {
    const result = parseTitleAndContent('  TITLE:   Chương 2  \n\nNội dung');
    expect(result.title).toBe('Chương 2');
    expect(result.content).toBe('Nội dung');
  });

  it('normalizes markdown chapter title artifacts', () => {
    const result = parseTitleAndContent('TITLE: # CHƯƠNG 6: GÀ NƯỚNG\n\nNội dung');
    expect(result.title).toBe('GÀ NƯỚNG');
    expect(result.content).toBe('Nội dung');
  });

  it('normalizes English chapter title artifacts', () => {
    const result = parseTitleAndContent('TITLE: CHAPTER 23: ỐC ĐẢO TRONG SA MẠC\n\nNội dung');
    expect(result.title).toBe('ỐC ĐẢO TRONG SA MẠC');
    expect(result.content).toBe('Nội dung');
  });

  it('normalizes nested TITLE prefix artifacts', () => {
    const result = parseTitleAndContent('TITLE: TITLE: Bàn Tay Đen\n\nNội dung');
    expect(result.title).toBe('Bàn Tay Đen');
    expect(result.content).toBe('Nội dung');
  });

  it('removes generated end-of-chapter footer markers', () => {
    const result = parseTitleAndContent('TITLE: Chương 6\n\nNội dung\n\n*Hết chương 6*');
    expect(result.title).toBe('Chương 6');
    expect(result.content).toBe('Nội dung');
  });

  it('removes bold uppercase generated end-of-chapter footer markers', () => {
    const result = parseTitleAndContent('TITLE: Bàn Tay Từ Tinh Hà\n\nNội dung\n\n**HẾT CHƯƠNG 30**');
    expect(result.title).toBe('Bàn Tay Từ Tinh Hà');
    expect(result.content).toBe('Nội dung');
  });

  it('falls back to first line as title when no TITLE: prefix', () => {
    const result = parseTitleAndContent('Chương 3\nNội dung chương');
    expect(result.title).toBe('Chương 3');
    expect(result.content).toBe('Nội dung chương');
  });

  it('returns "Vô đề" when content is empty', () => {
    const result = parseTitleAndContent('');
    expect(result.title).toBe('Vô đề');
  });
});

describe('WriterAgent', () => {
  it('writes chapter and parses title/content', async () => {
    const provider = new MockProvider({
      responder: {
        kind: 'fixed',
        content: 'TITLE: Sương Mù Đỏ\n\nLam Trach bước vào rừng...',
      },
    });
    const agent = new WriterAgent({ provider });

    const result = await agent.write({
      serializedContext: 'context-data',
      cacheKey: 'cache-key-1',
      chapterNumber: 5,
      storyId: 'story-1',
      traceId: 'trace-1',
      genreDef: { slug: 'tien_hiep', viLabel: 'Tiên hiệp', viDescription: '', family: 'cultivation', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any,
    });

    expect(result.title).toBe('Sương Mù Đỏ');
    expect(result.content).toContain('Lam Trach bước vào rừng');
    expect(result.usage.inputTokens).toBeGreaterThan(0);
    expect(result.cost).toBe(0);

    const calls = provider.getCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.metadata!.agentRole).toBe('writer');
    expect(calls[0]!.metadata!.promptVersion).toBe('v2');
  });

  it('sends system and user messages', async () => {
    const provider = new MockProvider({
      responder: { kind: 'fixed', content: 'TITLE: Test\n\nBody' },
    });
    const agent = new WriterAgent({ provider });

    await agent.write({
      serializedContext: 'my-context',
      cacheKey: 'k',
      chapterNumber: 1,
      storyId: 's1',
      traceId: 't1',
      genreDef: { slug: 'tien_hiep', viLabel: 'Tiên hiệp', viDescription: '', family: 'cultivation', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any,
    });

    const call = provider.getCalls()[0]!;
    expect(call.messages).toHaveLength(2);
    expect(call.messages[0]!.role).toBe('system');
    expect(call.messages[1]!.role).toBe('user');
  });

  it('uses modelFor writer route when deps model missing', async () => {
    setModelRoutes({ writer: 'google/gemini-2.5-pro' });
    const provider = new MockProvider({
      responder: { kind: 'fixed', content: 'TITLE: Test\n\nBody' },
    });
    const agent = new WriterAgent({ provider });

    await agent.write({
      serializedContext: 'my-context',
      cacheKey: 'k',
      chapterNumber: 1,
      storyId: 's1',
      traceId: 't1',
      genreDef: { slug: 'tien_hiep', viLabel: 'Tiên hiệp', viDescription: '', family: 'cultivation', allowedTropes: [], discouragedTropes: [], toneGuidance: '', worldbuildingGuidance: '', examplePremises: [] } as any,
    });

    expect(provider.getCalls()[0]!.model).toBe(modelFor('writer'));
  });
});
