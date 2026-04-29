import { describe, it, expect } from 'vitest';
import { renderEpub } from '../src/services/exporters/epub-exporter';

describe('renderEpub', () => {
  it('returns a Buffer with EPUB magic bytes (PK zip signature)', async () => {
    const buf = await renderEpub({
      story: { title: 'Trùng Sinh', author: 'Test', synopsis: 'A returns home.' },
      chapters: [{ number: 1, title: 'Khởi đầu', content: 'Đoạn 1.\n\nĐoạn 2.' }],
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf[0]).toBe(0x50); // 'P'
    expect(buf[1]).toBe(0x4b); // 'K'
  });
});
