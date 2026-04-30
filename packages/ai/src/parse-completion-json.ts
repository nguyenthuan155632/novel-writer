import type { CompletionResponse } from './providers/types.ts';

function tryParsedFromMessage(msg: Record<string, unknown>): unknown {
  const parsed = msg.parsed;
  if (parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed;
  }
  const c = msg.content;
  if (c != null && typeof c === 'object' && !Array.isArray(c)) {
    return c;
  }
  return undefined;
}

function isTransientError(res: CompletionResponse): boolean {
  return res.finishReason === 'error' || res.finishReason === 'content_filter';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries the completion call on transient model errors
 * (finishReason=error or finishReason=content_filter) and returns the raw
 * CompletionResponse so callers can do their own parsing.
 */
export async function withCompletionRetryRaw(
  context: string,
  complete: () => Promise<CompletionResponse>,
  maxRetries: number = 3,
): Promise<CompletionResponse> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 30_000);
      await delay(backoffMs);
    }
    const res = await complete();
    if (!isTransientError(res)) {
      return res;
    }
    if (attempt >= maxRetries) {
      throw new Error(`${context}: empty completion content (finishReason=${res.finishReason})`);
    }
  }
  throw new Error(`${context}: exhausted retries`);
}

/**
 * Wraps a completion call with retry logic for transient model errors
 * (finishReason=error or finishReason=content_filter). Parse errors
 * (invalid JSON, wrong type) are not retried.
 */
export async function withCompletionRetry(
  context: string,
  complete: () => Promise<CompletionResponse>,
  maxRetries: number = 3,
): Promise<unknown> {
  const res = await withCompletionRetryRaw(context, complete, maxRetries);
  return parseCompletionJsonObject(res, context);
}

/**
 * Parses a JSON object from an LLM completion. Handles providers that return the literal
 * `"null"`, empty strings, or nest structured output on `choices[0].message.parsed`.
 */
export function parseCompletionJsonObject(res: CompletionResponse, context: string): unknown {
  const raw = res.raw as { choices?: Array<{ message?: Record<string, unknown> }> } | undefined;
  const fallbackMsg = raw?.choices?.[0]?.message;

  const trimmed =
    res.content == null || res.content === '' ? '' : String(res.content).trim();

  if (trimmed.length > 0) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      const snippet = trimmed.length > 400 ? `${trimmed.slice(0, 400)}…` : trimmed;
      throw new Error(`${context}: invalid JSON in completion content: ${snippet}`);
    }
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
    if (fallbackMsg) {
      const fromMsg = tryParsedFromMessage(fallbackMsg);
      if (fromMsg !== undefined) return fromMsg;
    }
    const kind =
      parsed === null ? 'null' : Array.isArray(parsed) ? 'array' : typeof parsed;
    throw new Error(
      `${context}: expected JSON object, got ${kind} (finishReason=${res.finishReason})`,
    );
  }

  if (fallbackMsg) {
    const fromMsg = tryParsedFromMessage(fallbackMsg);
    if (fromMsg !== undefined) return fromMsg;
  }

  throw new Error(`${context}: empty completion content (finishReason=${res.finishReason})`);
}
