import { estimateCostUsd } from '@novel/core';
import type { CompletionRequest, CompletionResponse, LLMProvider } from './providers/types.ts';

export interface LlmCallRecord {
  storyId?: string;
  chapterId?: string;
  agentRole: string;
  model: string;
  promptVersion?: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  estimatedCostUsd: string;
  traceId?: string;
}

export interface LoggedLLMProviderOptions {
  inner: LLMProvider;
  recordCall: (row: LlmCallRecord) => Promise<void> | void;
}

export class LoggedLLMProvider implements LLMProvider {
  readonly name: string;
  constructor(private opts: LoggedLLMProviderOptions) {
    this.name = `logged(${opts.inner.name})`;
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const meta = req.metadata ?? {};
    let res: CompletionResponse | undefined;
    try {
      res = await this.opts.inner.complete(req);
      return res;
    } catch (e) {
      throw e;
    } finally {
      const usage = res?.usage ?? { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
      const cost = estimateCostUsd(req.model, usage);
      const row: LlmCallRecord = {
        agentRole: meta.agentRole ?? 'unknown',
        model: req.model,
        promptVersion: meta.promptVersion,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedInputTokens: usage.cachedInputTokens,
        estimatedCostUsd: cost.toFixed(6),
        traceId: meta.traceId,
        storyId: meta.storyId,
        chapterId: (meta as Record<string, string | undefined>).chapterId,
      };
      try {
        await this.opts.recordCall(row);
      } catch (logErr) {
        console.error('llm_call_logger: failed to record', logErr);
      }
    }
  }
}

import { llmCalls, type NewLlmCall } from '@novel/db/schema';
import type { Db } from '@novel/db';

export function makeDrizzleRecorder(db: Db): (row: LlmCallRecord) => Promise<void> {
  return async (row: LlmCallRecord) => {
    const insert: NewLlmCall = {
      agentRole: row.agentRole,
      model: row.model,
      promptVersion: row.promptVersion ?? null,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      cachedInputTokens: row.cachedInputTokens,
      estimatedCostUsd: row.estimatedCostUsd,
      traceId: row.traceId ?? null,
      storyId: row.storyId ?? null,
      chapterId: row.chapterId ?? null,
    };
    await db.insert(llmCalls).values(insert);
  };
}