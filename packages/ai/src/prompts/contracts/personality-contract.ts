import type { PersonalityDef } from '@novel/core';

export function renderPersonalityContract(p: PersonalityDef): string {
  return [
    '# PROTAGONIST PERSONALITY CONTRACT',
    `Selected: ${p.viLabel} (${p.slug})`,
    `Description: ${p.viDescription}`,
    `Voice hints: ${p.voiceHints}`,
    `Decision style: ${p.decisionStyle}`,
    `Dialogue style: ${p.dialogueStyle}`,
    `Conflict response: ${p.conflictResponse}`,
    p.driftSignals.length > 0
      ? `Drift signals to avoid: ${p.driftSignals.join('; ')}`
      : '',
  ].filter(Boolean).join('\n');
}
