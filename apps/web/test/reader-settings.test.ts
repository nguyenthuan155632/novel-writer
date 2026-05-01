import { describe, expect, it } from 'vitest';

import {
  DEFAULT_READER_SETTINGS,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  clampFontSize,
  parseReaderSettings,
} from '../app/read/[storyId]/[chapterNumber]/reader-settings';

describe('clampFontSize', () => {
  it('returns the size when it is within bounds', () => {
    expect(clampFontSize(18)).toBe(18);
  });

  it('clamps to the minimum when too small', () => {
    expect(clampFontSize(5)).toBe(MIN_FONT_SIZE);
  });

  it('clamps to the maximum when too large', () => {
    expect(clampFontSize(99)).toBe(MAX_FONT_SIZE);
  });

  it('rounds non-integer sizes', () => {
    expect(clampFontSize(18.7)).toBe(19);
  });

  it('returns the default when the input is not a finite number', () => {
    expect(clampFontSize(Number.NaN)).toBe(DEFAULT_READER_SETTINGS.fontSize);
    expect(clampFontSize(Number.POSITIVE_INFINITY)).toBe(DEFAULT_READER_SETTINGS.fontSize);
  });
});

describe('parseReaderSettings', () => {
  it('returns defaults when input is null or undefined', () => {
    expect(parseReaderSettings(null)).toEqual(DEFAULT_READER_SETTINGS);
    expect(parseReaderSettings(undefined)).toEqual(DEFAULT_READER_SETTINGS);
  });

  it('returns defaults when input is not an object', () => {
    expect(parseReaderSettings('oops')).toEqual(DEFAULT_READER_SETTINGS);
    expect(parseReaderSettings(42)).toEqual(DEFAULT_READER_SETTINGS);
  });

  it('keeps a fully valid payload untouched', () => {
    const input = { theme: 'sepia', fontFamily: 'arial', fontSize: 22 };
    expect(parseReaderSettings(input)).toEqual(input);
  });

  it('falls back to defaults for unknown theme values', () => {
    const input = { theme: 'neon', fontFamily: 'arial', fontSize: 20 };
    expect(parseReaderSettings(input)).toEqual({
      theme: DEFAULT_READER_SETTINGS.theme,
      fontFamily: 'arial',
      fontSize: 20,
    });
  });

  it('falls back to defaults for unknown fontFamily values', () => {
    const input = { theme: 'sepia', fontFamily: 'comic-sans', fontSize: 20 };
    expect(parseReaderSettings(input)).toEqual({
      theme: 'sepia',
      fontFamily: DEFAULT_READER_SETTINGS.fontFamily,
      fontSize: 20,
    });
  });

  it('clamps out-of-range fontSize values', () => {
    expect(parseReaderSettings({ theme: 'paper', fontFamily: 'georgia', fontSize: 200 })).toEqual({
      theme: 'paper',
      fontFamily: 'georgia',
      fontSize: MAX_FONT_SIZE,
    });
  });

  it('merges partial payloads with defaults', () => {
    expect(parseReaderSettings({ fontSize: 24 })).toEqual({
      theme: DEFAULT_READER_SETTINGS.theme,
      fontFamily: DEFAULT_READER_SETTINGS.fontFamily,
      fontSize: 24,
    });
  });
});
