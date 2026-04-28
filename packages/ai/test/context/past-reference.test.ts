import { describe, expect, it } from 'vitest';
import { detectPastReferences } from '../../src/context/past-reference.js';

describe('detectPastReferences', () => {
  it('detects default keywords in text', () => {
    const result = detectPastReferences('Kể từ lần trước, hắn đã thay đổi.');
    expect(result).toContain('lần trước');
  });

  it('returns multiple matches', () => {
    const result = detectPastReferences('Năm xưa thuở nhỏ, kiếp trước hắn là ai?');
    expect(result).toContain('năm xưa');
    expect(result).toContain('thuở nhỏ');
    expect(result).toContain('kiếp trước');
  });

  it('returns empty array when no keywords found', () => {
    const result = detectPastReferences('Hắn bước đi trong rừng.');
    expect(result).toEqual([]);
  });

  it('uses custom keywords', () => {
    const result = detectPastReferences(' flashback to that day', ['callback', 'flashback']);
    expect(result).toContain('flashback');
  });

  it('is case-insensitive', () => {
    const result = detectPastReferences('LẦN TRƯỚC cái gì?');
    expect(result).toContain('lần trước');
  });

  it('does not partially match inside other words with default keywords', () => {
    const result = detectPastReferences('trước đây hắn đã đi');
    expect(result).toContain('trước đây');
  });
});