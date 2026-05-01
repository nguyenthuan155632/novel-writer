export type ReaderTheme = 'paper' | 'cream' | 'warm-dark' | 'pure-dark' | 'sepia';

export type ReaderFont = 'georgia' | 'arial' | 'times-new-roman' | 'courier-new';

export interface ReaderSettings {
  theme: ReaderTheme;
  fontFamily: ReaderFont;
  fontSize: number;
}

export const READER_SETTINGS_KEY = 'novel-reader-settings';

export const MIN_FONT_SIZE = 14;
export const MAX_FONT_SIZE = 28;

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  theme: 'paper',
  fontFamily: 'georgia',
  fontSize: 18,
};

export interface ThemePreset {
  id: ReaderTheme;
  label: string;
  background: string;
  text: string;
}

export const THEME_PRESETS: readonly ThemePreset[] = [
  { id: 'paper',     label: 'Paper',     background: '#fbf8f1', text: '#211f1b' },
  { id: 'cream',     label: 'Cream',     background: '#f5f0e8', text: '#2a2520' },
  { id: 'warm-dark', label: 'Warm dark', background: '#1a1510', text: '#d4c9b8' },
  { id: 'pure-dark', label: 'Pure dark', background: '#0f0f0f', text: '#cccccc' },
  { id: 'sepia',     label: 'Sepia',     background: '#f4ecd8', text: '#3b2f1e' },
] as const;

export interface FontOption {
  id: ReaderFont;
  label: string;
  stack: string;
}

export const FONT_OPTIONS: readonly FontOption[] = [
  { id: 'georgia',         label: 'Georgia',         stack: 'Georgia, "Times New Roman", serif' },
  { id: 'arial',           label: 'Arial',           stack: 'Arial, Helvetica, sans-serif' },
  { id: 'times-new-roman', label: 'Times New Roman', stack: '"Times New Roman", Times, serif' },
  { id: 'courier-new',     label: 'Courier New',     stack: '"Courier New", Courier, monospace' },
] as const;

const THEME_IDS = new Set<ReaderTheme>(THEME_PRESETS.map((t) => t.id));
const FONT_IDS = new Set<ReaderFont>(FONT_OPTIONS.map((f) => f.id));

export function clampFontSize(size: unknown): number {
  if (typeof size !== 'number' || !Number.isFinite(size)) {
    return DEFAULT_READER_SETTINGS.fontSize;
  }
  const rounded = Math.round(size);
  if (rounded < MIN_FONT_SIZE) return MIN_FONT_SIZE;
  if (rounded > MAX_FONT_SIZE) return MAX_FONT_SIZE;
  return rounded;
}

export function parseReaderSettings(raw: unknown): ReaderSettings {
  if (raw === null || typeof raw !== 'object') {
    return { ...DEFAULT_READER_SETTINGS };
  }
  const record = raw as Record<string, unknown>;
  const theme =
    typeof record.theme === 'string' && THEME_IDS.has(record.theme as ReaderTheme)
      ? (record.theme as ReaderTheme)
      : DEFAULT_READER_SETTINGS.theme;
  const fontFamily =
    typeof record.fontFamily === 'string' && FONT_IDS.has(record.fontFamily as ReaderFont)
      ? (record.fontFamily as ReaderFont)
      : DEFAULT_READER_SETTINGS.fontFamily;
  const fontSize = clampFontSize(record.fontSize);
  return { theme, fontFamily, fontSize };
}

export function getThemePreset(id: ReaderTheme): ThemePreset {
  return THEME_PRESETS.find((t) => t.id === id) ?? THEME_PRESETS[0];
}

export function getFontOption(id: ReaderFont): FontOption {
  return FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0];
}
