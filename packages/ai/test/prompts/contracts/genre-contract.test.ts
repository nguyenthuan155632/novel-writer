import { describe, it, expect } from 'vitest';
import { findGenre } from '@novel/core';
import { renderGenreContract } from '../../../src/prompts/contracts/genre-contract.ts';

describe('renderGenreContract', () => {
  it('includes label, family, allowed and discouraged tropes for "do_thi"', () => {
    const out = renderGenreContract(findGenre('do_thi'), {});
    expect(out).toContain('GENRE CONTRACT');
    expect(out).toContain('Đô thị');
    expect(out).toContain('family: urban');
    expect(out).toContain('Allowed tropes:');
    expect(out).toContain('công ty');
    expect(out).toContain('Avoid unless explicitly in canon:');
    expect(out).toContain('tu tiên');
    expect(out).toContain('PRIORITY RULES');
  });

  it('omits "Avoid unless..." line when discouragedTropes is empty (tuy_chon)', () => {
    const out = renderGenreContract(findGenre('tuy_chon'), {});
    expect(out).toContain('Tuỳ chọn');
    expect(out).not.toContain('Avoid unless explicitly in canon:');
  });
});
