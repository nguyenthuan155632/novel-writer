import { describe, expect, it } from 'vitest';
import { sha256, sha256Short } from '../../src/utils/hash.js';

describe('sha256', () => {
  it('is deterministic', () => expect(sha256('abc')).toBe(sha256('abc')));
  it('short truncates', () => expect(sha256Short('abc', 8)).toHaveLength(8));
  it('different input → different hash', () => expect(sha256('a')).not.toBe(sha256('b')));
});