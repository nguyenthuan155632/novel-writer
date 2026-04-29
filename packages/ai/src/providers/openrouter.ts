import type { CompletionRequest, CompletionResponse, LLMProvider, Message } from './types.ts';

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  httpReferer?: string;
  xTitle?: string;
  fetchImpl?: typeof fetch;
}

interface OpenRouterChatPayload {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  response_format?: {
    type: 'json_schema';
    json_schema: { name: string; schema: unknown; strict: true };
  };
}

interface OpenRouterChatResponse {
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
}

const DEFAULT_BASE = 'https://openrouter.ai/api/v1';

/** HTTP statuses that often resolve with a short wait (rate limits, overload). */
const RETRYABLE_STATUSES = new Set([429, 502, 503]);

const MAX_COMPLETION_ATTEMPTS = 6;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Walk nested JSON for OpenRouter-style `retry_after_seconds`. */
function parseRetryAfterSecondsFromBody(text: string): number | undefined {
  try {
    const j = JSON.parse(text) as unknown;
    const walk = (o: unknown): number | undefined => {
      if (o && typeof o === 'object' && o !== null && 'retry_after_seconds' in o) {
        const v = (o as { retry_after_seconds: unknown }).retry_after_seconds;
        if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return v;
      }
      if (o && typeof o === 'object' && o !== null) {
        for (const v of Object.values(o)) {
          const found = walk(v);
          if (found !== undefined) return found;
        }
      }
      return undefined;
    };
    return walk(j);
  } catch {
    return undefined;
  }
}

function parseRetryAfterHeader(headers: { get(name: string): string | null } | undefined): number | undefined {
  if (!headers) return undefined;
  const raw = headers.get('retry-after');
  if (!raw) return undefined;
  const sec = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(sec) && sec >= 0 ? sec : undefined;
}

/** Delay before the next attempt; prefers server hints, then exponential backoff. */
function retryDelayMs(
  attemptIndex: number,
  status: number,
  errorBody: string,
  headers: { get(name: string): string | null } | undefined,
): number {
  const fromBody = parseRetryAfterSecondsFromBody(errorBody);
  const fromHeader = parseRetryAfterHeader(headers);
  const serverSec = fromBody ?? fromHeader;
  if (serverSec != null && serverSec > 0) {
    return Math.min(serverSec * 1000, 120_000);
  }
  if (status === 429) {
    return Math.min(1000 * 2 ** attemptIndex, 60_000);
  }
  return Math.min(500 * 2 ** attemptIndex, 30_000);
}

export class OpenRouterProvider implements LLMProvider {
  readonly name = 'openrouter';

  constructor(private config: OpenRouterConfig) {
    if (!config.apiKey) throw new Error('OpenRouter apiKey is required');
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const fetchFn = this.config.fetchImpl ?? globalThis.fetch;
    const payload: OpenRouterChatPayload = {
      model: req.model,
      messages: req.messages.map(this.toOpenRouterMessage),
      temperature: req.temperature,
      top_p: req.topP,
      max_tokens: req.maxOutputTokens,
    };
    if (req.responseSchema) {
      payload.response_format = {
        type: 'json_schema',
        json_schema: { name: 'response', schema: req.responseSchema, strict: true },
      };
    }
    const url = (this.config.baseUrl ?? DEFAULT_BASE) + '/chat/completions';
    const requestInit: RequestInit = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...(this.config.httpReferer ? { 'HTTP-Referer': this.config.httpReferer } : {}),
        ...(this.config.xTitle ? { 'X-Title': this.config.xTitle } : {}),
      },
      body: JSON.stringify(payload),
    };

    let lastStatus = 0;
    let lastBody = '';

    for (let attempt = 0; attempt < MAX_COMPLETION_ATTEMPTS; attempt++) {
      const res = await fetchFn(url, requestInit);
      if (res.ok) {
        const data = (await res.json()) as OpenRouterChatResponse;
        const choice = data.choices?.[0];
        if (!choice) throw new Error('OpenRouter returned no choices');
        const inputTokens = data.usage?.prompt_tokens ?? 0;
        const outputTokens = data.usage?.completion_tokens ?? 0;
        const cachedInputTokens = data.usage?.prompt_tokens_details?.cached_tokens ?? 0;
        return {
          content: choice.message.content,
          usage: { inputTokens, outputTokens, cachedInputTokens },
          finishReason: this.mapFinish(choice.finish_reason),
          raw: data,
        };
      }

      lastStatus = res.status;
      lastBody = await res.text();
      const canRetry = RETRYABLE_STATUSES.has(res.status) && attempt < MAX_COMPLETION_ATTEMPTS - 1;
      if (!canRetry) break;
      const waitMs = retryDelayMs(attempt, res.status, lastBody, res.headers);
      await delay(waitMs);
    }

    throw new Error(`OpenRouter error ${lastStatus}: ${lastBody}`);
  }

  private toOpenRouterMessage(m: Message): { role: string; content: string } {
    return { role: m.role, content: m.content };
  }

  private mapFinish(r: string): CompletionResponse['finishReason'] {
    if (r === 'stop' || r === 'length' || r === 'content_filter') return r;
    return 'error';
  }
}