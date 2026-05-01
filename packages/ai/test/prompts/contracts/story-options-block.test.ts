import { describe, it, expect } from 'vitest';
import { renderStoryOptionsBlock } from '../../../src/prompts/contracts/story-options-block.ts';

describe('renderStoryOptionsBlock', () => {
  it('shows viLabels for set fields and "(không chỉ định)" for missing', () => {
    const out = renderStoryOptionsBlock({ tone: 'serious', pov: 'first' });
    expect(out).toContain('STORY OPTIONS');
    expect(out).toContain('Tone: Nghiêm túc');
    expect(out).toContain('POV: Ngôi nhất');
    expect(out).toContain('Pacing: (không chỉ định)');
    expect(out).toContain('Romance: (không chỉ định)');
  });

  it('handles fully empty input', () => {
    const out = renderStoryOptionsBlock({});
    expect(out).toContain('Tone: (không chỉ định)');
  });
});
