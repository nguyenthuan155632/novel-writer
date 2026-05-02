import type { GenreDef, StoryOptions } from "@novel/core";
import { TONES, PACINGS, POVS, MORALITIES } from "@novel/core";

export function renderGenreContract(g: GenreDef, opts: StoryOptions): string {
  const label = <T extends { slug: string; viLabel: string }>(
    list: readonly T[],
    slug: string | undefined,
  ): string | null =>
    slug ? (list.find((x) => x.slug === slug)?.viLabel ?? slug) : null;

  const optLines: string[] = [];
  const toneLbl = label(TONES, opts.tone);
  if (toneLbl) optLines.push(`Tone: ${toneLbl}`);
  const povLbl = label(POVS, opts.pov);
  if (povLbl) optLines.push(`Narrative POV: ${povLbl}`);
  const moralityLbl = label(MORALITIES, opts.protagonistMorality);
  if (moralityLbl) optLines.push(`Protagonist morality: ${moralityLbl}`);
  const pacingLbl = label(PACINGS, opts.pacing);
  if (pacingLbl) optLines.push(`Pacing: ${pacingLbl}`);

  return [
    "# GENRE CONTRACT (BẮT BUỘC)",
    `Selected genre: ${g.viLabel} (${g.slug}) — family: ${g.family}`,
    `Description: ${g.viDescription}`,
    g.allowedTropes.length > 0
      ? `Allowed tropes: ${g.allowedTropes.join(", ")}`
      : "",
    g.discouragedTropes.length > 0
      ? `Avoid unless explicitly in canon: ${g.discouragedTropes.join(", ")}`
      : "",
    `Tone guidance: ${g.toneGuidance}`,
    `Worldbuilding guidance: ${g.worldbuildingGuidance}`,
    optLines.length > 0 ? `\nStory configuration:\n${optLines.join("\n")}` : "",
    "",
    "# PRIORITY RULES",
    "- Genre đã chọn là ràng buộc ưu tiên cao.",
    "- Khi xung đột giữa default template và genre option, GENRE thắng.",
    "- Khi xung đột giữa genre và canon đã tồn tại, CANON thắng nhưng giữ consistency.",
    "- KHÔNG tự ý đưa trope của thể loại khác vào nếu chưa có trong canon.",
  ]
    .filter(Boolean)
    .join("\n");
}
