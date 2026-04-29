import { OpenCodeProvider } from '@novel/ai/providers/opencode';
import { MockProvider } from '@novel/ai/providers/mock';
import { LoggedLLMProvider, makeDrizzleRecorder } from '@novel/ai/llm-call-logger';
import type { LLMProvider } from '@novel/ai/providers/types';
import { getDb } from '@novel/db';

export function buildLoggedProvider(opts?: { mockResponse?: string }): LLMProvider {
  const forceMock = process.env.NOVEL_FORCE_MOCK_LLM === '1';
  const mockResponse = opts?.mockResponse ?? process.env.NOVEL_MOCK_LLM_RESPONSE;
  const inner: LLMProvider = (forceMock || opts?.mockResponse)
    ? new MockProvider({ responder: { kind: 'fixed', content: mockResponse ?? '{}' } })
    : new OpenCodeProvider({
        apiKey: requireEnv('OPENCODE_API_KEY'),
        baseUrl: process.env.OPENCODE_BASE_URL,
      });
  const recorder = makeDrizzleRecorder(getDb());
  return new LoggedLLMProvider({ inner, recordCall: recorder });
}

function requireEnv(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`${k} is required`);
  return v;
}
