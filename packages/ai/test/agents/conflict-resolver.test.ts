import { describe, it, expect, vi } from 'vitest';
import { ConflictResolverAgent } from '../../src/agents/conflict-resolver.js';
import type { LLMProvider } from '../../src/providers/types.js';
import type { CanonSnapshot } from '../../src/reconciliation/conflict-detector.js';

function makeMockProvider(responseContent: string): LLMProvider {
  return {
    complete: vi.fn(async () => ({
      content: responseContent,
      usage: { inputTokens: 10, outputTokens: 5, cachedInputTokens: 0 },
    })),
  } as unknown as LLMProvider;
}

const EMPTY_SNAPSHOT: CanonSnapshot = {
  characters: [],
  canonFacts: [],
  threads: [],
  factions: [],
};

// §3.3 tests
describe('ConflictResolverAgent', () => {
  it('returns a parsed suggestion for a realm_regression conflict', async () => {
    const provider = makeMockProvider('{"defer_to_chapter": 15}');
    const agent = new ConflictResolverAgent({ provider });

    const result = await agent.suggest({
      updateRow: {
        updateType: 'update',
        targetTable: 'characters',
        targetId: 'char-1',
        payload: { name: 'Lam Trach', fields: { currentRealm: 'luyện khí' }, importance: 'medium' },
      },
      snapshot: EMPTY_SNAPSHOT,
      conflictReasons: ['realm_regression'],
      traceId: 'trace-1',
      storyId: 'story-1',
    });

    expect(result).toEqual({ defer_to_chapter: 15 });
  });

  it('returns null when importance is locked', async () => {
    const provider = makeMockProvider('{"discard": true}');
    const agent = new ConflictResolverAgent({ provider });

    const result = await agent.suggest({
      updateRow: {
        updateType: 'create',
        targetTable: 'canon_facts',
        targetId: null,
        payload: { fact: 'some fact', importance: 'locked' },
      },
      snapshot: EMPTY_SNAPSHOT,
      conflictReasons: ['duplicate_fact'],
      traceId: 'trace-2',
      storyId: 'story-1',
    });

    expect(result).toBeNull();
    // provider should not be called for locked importance.
    expect((provider.complete as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it('returns null when conflict includes locked_field', async () => {
    const provider = makeMockProvider('{"defer_to_chapter": 10}');
    const agent = new ConflictResolverAgent({ provider });

    const result = await agent.suggest({
      updateRow: {
        updateType: 'update',
        targetTable: 'characters',
        targetId: 'char-1',
        payload: { name: 'Lam Trach', fields: { currentRealm: 'trúc cơ' }, importance: 'high' },
      },
      snapshot: EMPTY_SNAPSHOT,
      conflictReasons: ['locked_field'],
      traceId: 'trace-3',
      storyId: 'story-1',
    });

    expect(result).toBeNull();
    expect((provider.complete as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it('returns null when LLM response contains no JSON', async () => {
    const provider = makeMockProvider('I cannot determine a resolution.');
    const agent = new ConflictResolverAgent({ provider });

    const result = await agent.suggest({
      updateRow: {
        updateType: 'create',
        targetTable: 'canon_facts',
        targetId: null,
        payload: { fact: 'Lam Trach là chủ nhân Mộc Linh thể', importance: 'medium' },
      },
      snapshot: EMPTY_SNAPSHOT,
      conflictReasons: ['duplicate_fact'],
      traceId: 'trace-4',
      storyId: 'story-1',
    });

    expect(result).toBeNull();
  });

  it('returns null gracefully when provider throws', async () => {
    const provider = {
      complete: vi.fn(async () => { throw new Error('LLM error'); }),
    } as unknown as LLMProvider;
    const agent = new ConflictResolverAgent({ provider });

    const result = await agent.suggest({
      updateRow: {
        updateType: 'update',
        targetTable: 'characters',
        targetId: 'char-1',
        payload: { name: 'Lam Trach', fields: { currentRealm: 'trúc cơ' }, importance: 'medium' },
      },
      snapshot: EMPTY_SNAPSHOT,
      conflictReasons: ['realm_regression'],
      traceId: 'trace-5',
      storyId: 'story-1',
    });

    expect(result).toBeNull();
  });
});
