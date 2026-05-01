import { describe, it, expect } from 'vitest';
import { findPersonality } from '@novel/core';
import { renderPersonalityContract } from '../../../src/prompts/contracts/personality-contract.ts';

describe('renderPersonalityContract', () => {
  it('renders all fields for cunning_pragmatic', () => {
    const out = renderPersonalityContract(findPersonality('cunning_pragmatic'));
    expect(out).toContain('PROTAGONIST PERSONALITY CONTRACT');
    expect(out).toContain('Gian xảo, thực dụng');
    expect(out).toContain('Voice hints:');
    expect(out).toContain('Decision style:');
    expect(out).toContain('Dialogue style:');
    expect(out).toContain('Conflict response:');
    expect(out).toContain('Drift signals to avoid:');
    expect(out).toContain('hành xử thánh mẫu');
  });
});
