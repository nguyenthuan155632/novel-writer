import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../src/services/exporters/markdown-exporter';

describe('renderMarkdown', () => {
  it('renders title, author, then chapters in order with headings', () => {
    const md = renderMarkdown({
      story: { title: 'Trùng Sinh', author: 'Test', synopsis: 'A returns home.' },
      chapters: [
        { number: 1, title: 'Khởi đầu', content: 'Đoạn 1.\n\nĐoạn 2.' },
        { number: 2, title: 'Phong vân', content: 'Đoạn A.' },
      ],
    });
    expect(md).toContain('# Trùng Sinh');
    expect(md).toContain('_by Test_');
    expect(md).toContain('A returns home.');
    expect(md).toMatch(/## Chương 1.+Khởi đầu/);
    expect(md).toMatch(/## Chương 2.+Phong vân/);
    expect(md.indexOf('Chương 1')).toBeLessThan(md.indexOf('Chương 2'));
  });

  it('omits author line when no author', () => {
    const md = renderMarkdown({
      story: { title: 'X', author: null, synopsis: null },
      chapters: [{ number: 1, title: 'a', content: 'b' }],
    });
    expect(md).not.toContain('_by ');
  });
});
