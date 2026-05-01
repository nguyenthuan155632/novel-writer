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
      world_rules: 'world',
      power_system: 'power',
      power_system_kind: 'urban',
      style_guide: 'style',
      forbidden_rules: 'rules',
      ending_direction: 'ending',
      compact_summary: 'summary',
    });
    expect(ok.power_system_kind).toBe('urban');
    expect(ok.cultivation_system).toBeUndefined();
  });

  it('does not enforce hard length constraints on generated bible fields', () => {
    const ok = BibleV2Schema.parse({
      world_rules: 'short',
      power_system: 'Hệ thống sức mạnh xoay quanh Thánh huyết, Luật tắc và Khí vận. Mỗi huyết mạch mang theo một',
      power_system_kind: 'cultivation',
      cultivation_system: 'short',
      style_guide: 'short',
      forbidden_rules: 'short',
      ending_direction: 'short',
      compact_summary: 'short',
    });
    expect(ok.cultivation_system).toBe('short');
  });

  it('rejects cultivation kind missing cultivation_system', () => {
    expect(() => BibleV2Schema.parse({
      world_rules: 'world',
      power_system: 'power',
      power_system_kind: 'cultivation',
      style_guide: 'style',
      forbidden_rules: 'rules',
      ending_direction: 'ending',
      compact_summary: 'summary',
    })).toThrow(/cultivation_system/);
  });

  it('allows long compact_summary content', () => {
    const ok = BibleV2Schema.parse({
      world_rules: 'world',
      power_system: 'power',
      power_system_kind: 'urban',
      style_guide: 'style',
      forbidden_rules: 'rules',
      ending_direction: 'ending',
      compact_summary: 'summary '.repeat(1000),
    });
    expect(ok.compact_summary.length).toBeGreaterThan(2000);
  });

  it('exports a JSON schema with the same required fields', () => {
    expect(bibleV2JsonSchema.required).toEqual(expect.arrayContaining([
      'world_rules', 'power_system', 'power_system_kind',
      'style_guide', 'forbidden_rules', 'ending_direction', 'compact_summary',
    ]));
  });
});
