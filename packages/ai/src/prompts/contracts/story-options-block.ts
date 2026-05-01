import {
  TONES, PACINGS, MAIN_CONFLICT_TYPES, POWER_SYSTEM_STYLES, WORLD_ERAS,
  ROMANCE_LEVELS, COMEDY_LEVELS, DARK_LEVELS, POVS, MORALITIES,
  type StoryOptions,
} from '@novel/core';

export function renderStoryOptionsBlock(o: StoryOptions): string {
  const label = <T extends { slug: string; viLabel: string }>(
    list: readonly T[], slug: string | undefined,
  ): string => slug ? (list.find(x => x.slug === slug)?.viLabel ?? slug) : '(không chỉ định)';

  return [
    '# STORY OPTIONS',
    `Tone: ${label(TONES, o.tone)} | Pacing: ${label(PACINGS, o.pacing)} | Main conflict: ${label(MAIN_CONFLICT_TYPES, o.mainConflictType)}`,
    `Power system style: ${label(POWER_SYSTEM_STYLES, o.powerSystemStyle)} | World era: ${label(WORLD_ERAS, o.worldEra)} | POV: ${label(POVS, o.pov)}`,
    `Romance: ${label(ROMANCE_LEVELS, o.romanceLevel)} | Comedy: ${label(COMEDY_LEVELS, o.comedyLevel)} | Dark: ${label(DARK_LEVELS, o.darkLevel)} | Morality: ${label(MORALITIES, o.protagonistMorality)}`,
  ].join('\n');
}
