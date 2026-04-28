import type { CompletionRequest, CompletionResponse, LLMProvider } from './types.ts';

export class GoogleDirectProvider implements LLMProvider {
  readonly name = 'google-direct';
  async complete(_req: CompletionRequest): Promise<CompletionResponse> {
    throw new Error('GoogleDirectProvider not implemented yet — see spec Section 6.6 mitigation strategy');
  }
}