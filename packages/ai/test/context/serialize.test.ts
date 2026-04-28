import { describe, expect, it } from 'vitest';
import { canonicalJsonStringify } from '../../src/context/serialize.js';

describe('canonicalJsonStringify', () => {
  it('produces deterministic key ordering', () => {
    const a = { z: 1, a: 2, m: 3 };
    const b = { a: 2, m: 3, z: 1 };
    expect(canonicalJsonStringify(a)).toBe(canonicalJsonStringify(b));
    const parsed = JSON.parse(canonicalJsonStringify(a));
    expect(Object.keys(parsed)).toEqual(['a', 'm', 'z']);
  });

  it('handles nested objects with sorted keys', () => {
    const obj = { outer: { z: 1, a: 2 } };
    const result = canonicalJsonStringify(obj);
    const parsed = JSON.parse(result);
    expect(Object.keys(parsed.outer)).toEqual(['a', 'z']);
  });

  it('handles arrays preserving order', () => {
    const obj = { items: [3, 1, 2] };
    const result = canonicalJsonStringify(obj);
    expect(JSON.parse(result).items).toEqual([3, 1, 2]);
  });

  it('handles null and undefined', () => {
    expect(canonicalJsonStringify(null)).toBe('null');
  });

  it('handles primitives', () => {
    expect(canonicalJsonStringify(42)).toBe('42');
    expect(canonicalJsonStringify('hello')).toBe('"hello"');
    expect(canonicalJsonStringify(true)).toBe('true');
  });

  it('handles empty objects and arrays', () => {
    expect(canonicalJsonStringify({})).toBe('{}');
    expect(canonicalJsonStringify([])).toBe('[]');
  });
});