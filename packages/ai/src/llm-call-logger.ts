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

/** Shape of `bindings` passed to `logPrompts.log` (stdout debugging). */
export interface LlmPromptLogPayload {
  model: string;
  agentRole: string;
  promptVersion?: string;
  traceId?: string;
  storyId?: string;
  maxOutputTokens?: number;
  messages: { role: string; content: string }[];
}

/**
 * Human-readable block for terminal: metadata as lines, each message body with real newlines
 * (JSON.stringify escapes \\n inside strings and stays hard to read).
 */
export function formatLlmPromptPayloadForTerminal(payload: LlmPromptLogPayload): string {
  const lines: string[] = [];
  lines.push(`model: ${payload.model}`);
  lines.push(`agentRole: ${payload.agentRole}`);
  if (payload.promptVersion != null) lines.push(`promptVersion: ${payload.promptVersion}`);
  if (payload.traceId != null) lines.push(`traceId: ${payload.traceId}`);
  if (payload.storyId != null) lines.push(`storyId: ${payload.storyId}`);
  if (payload.maxOutputTokens != null) lines.push(`maxOutputTokens: ${String(payload.maxOutputTokens)}`);
  lines.push('');
  payload.messages.forEach((m, i) => {
    lines.push(`--- [${i}] ${m.role} ---`);
    lines.push(m.content);
    lines.push('');
  });
  return lines.join('\n');
}

export interface LoggedLLMProviderOptions {
  inner: LLMProvider;
  recordCall: (row: LlmCallRecord) => Promise<void> | void;
  /**
   * When set, logs each request’s messages before the HTTP call (can be very large).
   * Intended for local debugging; enable from the worker via `LOG_LLM_PROMPTS`.
   */
  logPrompts?: {
    log: (bindings: Record<string, unknown>, msg: string) => void;
    /** When set to a positive number, truncate each message body for logging only. */
    maxCharsPerMessage?: number;
  };
}

export class LoggedLLMProvider implements LLMProvider {
  readonly name: string;
  constructor(private opts: LoggedLLMProviderOptions) {
    this.name = `logged(${opts.inner.name})`;
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const meta = req.metadata ?? {};
    const logPrompts = this.opts.logPrompts;
    if (logPrompts) {
      const max = logPrompts.maxCharsPerMessage;
      const truncate = (s: string): string =>
        max != null && max > 0 && s.length > max
          ? `${s.slice(0, max)}…[truncated ${s.length - max} chars]`
          : s;
      const payload = {
        model: req.model,
        agentRole: meta.agentRole ?? 'unknown',
        promptVersion: meta.promptVersion,
        traceId: meta.traceId,
        storyId: meta.storyId,
        maxOutputTokens: req.maxOutputTokens,
        messages: req.messages.map(m => ({ role: m.role, content: truncate(m.content) })),
      };
      logPrompts.log(payload, 'LLM REQUEST PROMPT');
    }
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