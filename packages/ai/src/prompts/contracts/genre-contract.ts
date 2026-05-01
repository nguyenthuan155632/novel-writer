import type { GenreDef, StoryOptions } from '@novel/core';

export function renderGenreContract(g: GenreDef, _opts: StoryOptions): string {
  return [
    '# GENRE CONTRACT (BẮT BUỘC)',
    `Selected genre: ${g.viLabel} (${g.slug}) — family: ${g.family}`,
    `Description: ${g.viDescription}`,
    g.allowedTropes.length > 0
      ? `Allowed tropes: ${g.allowedTropes.join(', ')}`
      : '',
    g.discouragedTropes.length > 0
      ? `Avoid unless explicitly in canon: ${g.discouragedTropes.join(', ')}`
      : '',
    `Tone guidance: ${g.toneGuidance}`,
    `Worldbuilding guidance: ${g.worldbuildingGuidance}`,
    '',
    '# PRIORITY RULES',
    '- Genre đã chọn là ràng buộc ưu tiên cao.',
    '- Khi xung đột giữa default template và genre option, GENRE thắng.',
    '- Khi xung đột giữa genre và canon đã tồn tại, CANON thắng nhưng giữ consistency.',
    '- KHÔNG tự ý đưa trope của thể loại khác vào nếu chưa có trong canon.',
  ].filter(Boolean).join('\n');
}
