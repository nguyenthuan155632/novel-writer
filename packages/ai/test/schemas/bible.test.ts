import { describe, it, expect } from 'vitest';
import { BibleSchema, bibleJsonSchema, BibleV2Schema, bibleV2JsonSchema } from '../../src/schemas/bible.ts';

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

describe('BibleV2Schema', () => {
  it('accepts a non-cultivation bible (urban genre, no cultivation_system)', () => {
    const ok = BibleV2Schema.parse({
      world_rules: 'x'.repeat(60),
      power_system: 'A modern urban world without cultivation. '.repeat(5),
      power_system_kind: 'urban',
      style_guide: 'x'.repeat(120),
      forbidden_rules: 'rule one rule two rule three',
      ending_direction: 'x'.repeat(110),
      compact_summary: 'x'.repeat(100),
    });
    expect(ok.power_system_kind).toBe('urban');
    expect(ok.cultivation_system).toBeUndefined();
  });

  it('rejects cultivation kind missing cultivation_system', () => {
    expect(() => BibleV2Schema.parse({
      world_rules: 'x'.repeat(60),
      power_system: 'x'.repeat(60),
      power_system_kind: 'cultivation',
      style_guide: 'x'.repeat(120),
      forbidden_rules: 'rule one rule two rule three',
      ending_direction: 'x'.repeat(110),
      compact_summary: 'x'.repeat(100),
    })).toThrow(/cultivation_system/);
  });

  it('exports a JSON schema with the same required fields', () => {
    expect(bibleV2JsonSchema.required).toEqual(expect.arrayContaining([
      'world_rules', 'power_system', 'power_system_kind',
      'style_guide', 'forbidden_rules', 'ending_direction', 'compact_summary',
    ]));
  });
});