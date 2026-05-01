import type { CompletionRequest, CompletionResponse, LLMProvider, Message } from './types.ts';

export interface VmlxConfig {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

interface VmlxChatPayload {
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

interface VmlxChatResponse {
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

const DEFAULT_BASE = 'http://localhost:8000/v1';

export class VmlxProvider implements LLMProvider {
  readonly name = 'vmlx';

  constructor(private config: VmlxConfig = {}) {}

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const fetchFn = this.config.fetchImpl ?? globalThis.fetch;
    const body: VmlxChatPayload = {
      model: req.model,
      messages: req.messages.map(this.toVmlxMessage),
      temperature: req.temperature,
      top_p: req.topP,
      max_tokens: req.maxOutputTokens,
    };
    if (req.responseSchema) {
      body.response_format = {
        type: 'json_schema',
        json_schema: { name: 'response', schema: req.responseSchema, strict: true },
      };
    }
    const url = (this.config.baseUrl ?? DEFAULT_BASE) + '/chat/completions';
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`vMLX error ${res.status}: ${text}`);
    }
    const data = (await res.json()) as VmlxChatResponse;
    const choice = data.choices?.[0];
    if (!choice) throw new Error('vMLX returned no choices');
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

  private toVmlxMessage(m: Message): { role: string; content: string } {
    return { role: m.role, content: m.content };
  }

  private mapFinish(r: string): CompletionResponse['finishReason'] {
    if (r === 'stop' || r === 'length' || r === 'content_filter') return r;
    return 'error';
  }
}
