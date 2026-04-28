import { describe, it, expect } from 'vitest';
import { asStoryId, type StoryId } from '../src/types/ids.ts';

describe('branded ids', () => {
  it('asStoryId returns the same string', () => {
    const id: StoryId = asStoryId('11111111-1111-1111-1111-111111111111');
    expect(id).toBe('11111111-1111-1111-1111-111111111111');
  });
});
