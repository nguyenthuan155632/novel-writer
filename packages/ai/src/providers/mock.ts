import type { CompletionRequest, CompletionResponse, LLMProvider } from './types.ts';

export type MockResponder =
  | { kind: 'fixed'; content: string; usage?: Partial<CompletionResponse['usage']> }
  | { kind: 'fn'; fn: (req: CompletionRequest) => CompletionResponse | Promise<CompletionResponse> };

export interface MockProviderOptions {
  responder: MockResponder;
}

export class MockProvider implements LLMProvider {
  readonly name = 'mock';
  private callLog: CompletionRequest[] = [];

  constructor(private opts: MockProviderOptions) {}

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    this.callLog.push(req);
    if (this.opts.responder.kind === 'fixed') {
      const usage = this.opts.responder.usage ?? {};
      return {
        content: this.opts.responder.content,
        usage: {
          inputTokens: usage.inputTokens ?? 100,
          outputTokens: usage.outputTokens ?? 50,
          cachedInputTokens: usage.cachedInputTokens ?? 0,
        },
        finishReason: 'stop',
        raw: { mocked: true },
      };
    }
    return this.opts.responder.fn(req);
  }

  getCalls(): readonly CompletionRequest[] {
    return this.callLog;
  }

  reset(): void {
    this.callLog = [];
  }
}