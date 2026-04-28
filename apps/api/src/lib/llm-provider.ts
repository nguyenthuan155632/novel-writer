import { OpenRouterProvider } from '@novel/ai/providers/openrouter';
import { MockProvider } from '@novel/ai/providers/mock';
import { LoggedLLMProvider, makeDrizzleRecorder } from '@novel/ai/llm-call-logger';
import type { LLMProvider } from '@novel/ai/providers/types';
import { getDb } from '@novel/db';

export function buildLoggedProvider(opts?: { mockResponse?: string }): LLMProvider {
  const forceMock = process.env.NOVEL_FORCE_MOCK_LLM === '1';
  const mockResponse = opts?.mockResponse ?? process.env.NOVEL_MOCK_LLM_RESPONSE;
  const inner: LLMProvider = (forceMock || opts?.mockResponse)
    ? new MockProvider({ responder: { kind: 'fixed', content: mockResponse ?? '{}' } })
    : new OpenRouterProvider({
        apiKey: requireEnv('OPENROUTER_API_KEY'),
        baseUrl: process.env.OPENROUTER_BASE_URL,
        httpReferer: process.env.OPENROUTER_HTTP_REFERER,
        xTitle: process.env.OPENROUTER_X_TITLE,
      });
  const recorder = makeDrizzleRecorder(getDb());
  return new LoggedLLMProvider({ inner, recordCall: recorder });
}

function requireEnv(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`${k} is required`);
  return v;
}