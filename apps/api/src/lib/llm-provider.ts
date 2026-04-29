import { MockProvider } from '@novel/ai/providers/mock';
import { LoggedLLMProvider, makeDrizzleRecorder } from '@novel/ai/llm-call-logger';
import type { LLMProvider } from '@novel/ai/providers/types';
import { getDb } from '@novel/db';
import { buildLiveProvider } from './provider-switcher.ts';

export async function buildLoggedProvider(opts?: { mockResponse?: string }): Promise<LLMProvider> {
  const forceMock = process.env.NOVEL_FORCE_MOCK_LLM === '1';
  const mockResponse = opts?.mockResponse ?? process.env.NOVEL_MOCK_LLM_RESPONSE;
  const inner: LLMProvider = (forceMock || opts?.mockResponse)
    ? new MockProvider({ responder: { kind: 'fixed', content: mockResponse ?? '{}' } })
    : await buildLiveProvider();
  const recorder = makeDrizzleRecorder(getDb());
  return new LoggedLLMProvider({ inner, recordCall: recorder });
}
