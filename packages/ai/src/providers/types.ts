export type Role = 'system' | 'user' | 'assistant';

export interface Message {
  role: Role;
  content: string;
}

export interface JsonSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface CompletionRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  responseSchema?: JsonSchema;
  cacheBreakpoints?: number[];
  metadata?: { agentRole?: string; promptVersion?: string; traceId?: string };
}

export interface CompletionUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
}

export interface CompletionResponse {
  content: string;
  usage: CompletionUsage;
  finishReason: 'stop' | 'length' | 'error' | 'content_filter';
  raw: unknown;
}

export interface LLMProvider {
  name: string;
  complete(req: CompletionRequest): Promise<CompletionResponse>;
}