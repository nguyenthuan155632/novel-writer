import type { CompletionRequest, CompletionResponse } from './providers/types.ts';

export interface ParseRecoveryEvent {
  strategy: 'strip_fences' | 'extract_object' | 're_prompt';
  detail: string;
}

export interface ParseRetryOptions {
  request?: CompletionRequest;
  onParseRecovery?: (event: ParseRecoveryEvent) => void;
}

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

function tryParseObjectString(content: string): unknown {
  const parsed = JSON.parse(content);
  if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed;
  }
  return parsed;
}

function stripMarkdownFences(content: string): string | null {
  const match = content.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const fenced = match?.[1];
  return fenced != null ? fenced.trim() : null;
}

function extractFirstJsonObject(content: string): string | null {
  const start = content.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < content.length; i++) {
    const ch = content[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        return content.slice(start, i + 1);
      }
    }
  }

  return null;
}

function snippet(content: string): string {
  return content.length > 400 ? `${content.slice(0, 400)}…` : content;
}

function buildInvalidJsonError(context: string, content: string): Error {
  return new Error(`${context}: invalid JSON in completion content: ${snippet(content)}`);
}

function parseCandidateObject(content: string): { value?: unknown; error?: Error } {
  try {
    return { value: tryParseObjectString(content) };
  } catch {
    return { error: buildInvalidJsonError('parse', content) };
  }
}

function finalizeParsedObject(
  parsed: unknown,
  context: string,
  finishReason: CompletionResponse['finishReason'],
): unknown {
  if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed;
  }
  const kind = parsed === null ? 'null' : Array.isArray(parsed) ? 'array' : typeof parsed;
  throw new Error(`${context}: expected JSON object, got ${kind} (finishReason=${finishReason})`);
}

/**
 * Retries completion call on transient model errors and returns raw response.
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
 * Wraps completion call with transient retry and parse recovery.
 */
export async function withCompletionRetry(
  context: string,
  complete: (requestOverride?: CompletionRequest) => Promise<CompletionResponse>,
  maxRetries: number = 3,
  options?: ParseRetryOptions,
): Promise<unknown> {
  const res = await withCompletionRetryRaw(context, () => complete(), maxRetries);
  try {
    return parseCompletionJsonObject(res, context, options?.onParseRecovery);
  } catch (error) {
    if (!options?.request?.responseSchema) {
      throw error;
    }
    options.onParseRecovery?.({
      strategy: 're_prompt',
      detail: error instanceof Error ? error.message : `${error}`,
    });
    const repaired = await complete({
      ...options.request,
      messages: [
        {
          role: 'system',
          content: [
            options.request.messages[0]?.content ?? '',
            'Chỉ trả JSON object hợp lệ theo response schema. Không dùng markdown fence. Không giải thích.',
          ].join('\n\n').trim(),
        },
        {
          role: 'user',
          content: [
            ...options.request.messages.filter((message) => message.role !== 'system').map((message) => message.content),
            `Parse error trước đó: ${error instanceof Error ? error.message : `${error}`}`,
            'Hãy trả lại duy nhất 1 JSON object hợp lệ theo schema đã cung cấp.',
          ].join('\n\n'),
        },
      ],
    });
    return parseCompletionJsonObject(repaired, context, options.onParseRecovery);
  }
}

/**
 * Parses JSON object from completion. Handles null, empty strings, nested parsed output,
 * markdown fences, and object extraction from surrounding text.
 */
export function parseCompletionJsonObject(
  res: CompletionResponse,
  context: string,
  onParseRecovery?: (event: ParseRecoveryEvent) => void,
): unknown {
  const raw = res.raw as { choices?: Array<{ message?: Record<string, unknown> }> } | undefined;
  const fallbackMsg = raw?.choices?.[0]?.message;
  const trimmed = res.content == null || res.content === '' ? '' : String(res.content).trim();

  if (trimmed.length > 0) {
    const direct = parseCandidateObject(trimmed);
    if (direct.value !== undefined) {
      try {
        return finalizeParsedObject(direct.value, context, res.finishReason);
      } catch (error) {
        if (fallbackMsg) {
          const fromMsg = tryParsedFromMessage(fallbackMsg);
          if (fromMsg !== undefined) return fromMsg;
        }
        throw error;
      }
    }

    const unfenced = stripMarkdownFences(trimmed);
    if (unfenced) {
      const parsed = parseCandidateObject(unfenced);
      if (parsed.value !== undefined) {
        onParseRecovery?.({ strategy: 'strip_fences', detail: 'parsed object after removing markdown fences' });
        return finalizeParsedObject(parsed.value, context, res.finishReason);
      }
    }

    const extracted = extractFirstJsonObject(trimmed);
    if (extracted) {
      const parsed = parseCandidateObject(extracted);
      if (parsed.value !== undefined) {
        onParseRecovery?.({ strategy: 'extract_object', detail: 'parsed first JSON object from mixed content' });
        return finalizeParsedObject(parsed.value, context, res.finishReason);
      }
    }

    if (fallbackMsg) {
      const fromMsg = tryParsedFromMessage(fallbackMsg);
      if (fromMsg !== undefined) return fromMsg;
    }

    throw buildInvalidJsonError(context, trimmed);
  }

  if (fallbackMsg) {
    const fromMsg = tryParsedFromMessage(fallbackMsg);
    if (fromMsg !== undefined) return fromMsg;
  }

  throw new Error(`${context}: empty completion content (finishReason=${res.finishReason})`);
}
