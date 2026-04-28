import { describe, it, expect } from 'vitest';
import { BibleSchema, bibleJsonSchema } from '../../src/schemas/bible.ts';

describe('BibleSchema', () => {
  it('parses a complete bible', () => {
    const r = BibleSchema.parse({
      world_rules: 'r'.repeat(60),
      cultivation_system: 'c'.repeat(60),
      bloodline_system: 'b'.repeat(60),
      style_guide: 's'.repeat(60),
      forbidden_rules: 'f'.repeat(30),
      ending_direction: 'e'.repeat(30),
      compact_summary: 'cs'.repeat(60),
    });
    expect(r.world_rules).toMatch(/^r+$/);
  });

  it('rejects missing required fields', () => {
    expect(() => BibleSchema.parse({})).toThrow();
  });

  it('exposes a JSON Schema for structured output', () => {
    expect(bibleJsonSchema.type).toBe('object');
    expect(bibleJsonSchema.required).toContain('world_rules');
    expect(bibleJsonSchema.required).toContain('forbidden_rules');
  });
});