import type { CompletionRequest, CompletionResponse, LLMProvider, Message } from './types.ts';

export interface OpenAICompatibleConfig {
  apiKey: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

interface OpenAICompatibleChatPayload {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream: false;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  response_format?: {
    type: 'json_schema';
    json_schema: { name: string; schema: unknown; strict: true };
  };
}

interface OpenAICompatibleChatResponse {
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

interface OpenAICompatibleChatEnvelope {
  choices?: OpenAICompatibleChatResponse['choices'];
  usage?: OpenAICompatibleChatResponse['usage'];
  data?: OpenAICompatibleChatResponse;
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly name = 'openai-compatible';

  constructor(private config: OpenAICompatibleConfig) {
    if (!config.apiKey) throw new Error('OpenAI-compatible apiKey is required');
    if (!config.baseUrl) throw new Error('OpenAI-compatible baseUrl is required');
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const fetchFn = this.config.fetchImpl ?? globalThis.fetch;
    const body: OpenAICompatibleChatPayload = {
      model: req.model,
      messages: req.messages.map(this.toOpenAICompatibleMessage),
      stream: false,
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
    const url = `${this.config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const res = await fetchFn(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI-compatible error ${res.status}: ${text}`);
    }
    const envelope = (await res.json()) as OpenAICompatibleChatEnvelope;
    const data = envelope.data ?? envelope;
    const choice = data.choices?.[0];
    if (!choice) throw new Error('OpenAI-compatible provider returned no choices');
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

  private toOpenAICompatibleMessage(m: Message): { role: string; content: string } {
    return { role: m.role, content: m.content };
  }

  private mapFinish(r: string): CompletionResponse['finishReason'] {
    if (r === 'stop' || r === 'length' || r === 'content_filter') return r;
    return 'error';
  }
}
