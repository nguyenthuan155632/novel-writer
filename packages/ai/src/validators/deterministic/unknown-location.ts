import type { CheckInput, CheckResult, DeterministicCheck } from './types.ts';

export const unknownLocationCheck: DeterministicCheck = {
  id: 'unknown_location',
  severity: 'low',
  run(input: CheckInput): CheckResult {
    const issues: string[] = [];
    const knownLocations = new Set(input.canon.knownLocationNames.map(n => n.toLowerCase()));
    const knownCharacters = new Set(input.canon.knownCharacterNames.map(n => n.toLowerCase()));
    const knownBloodlines = new Set(input.canon.knownBloodlineNames.map(n => n.toLowerCase()));

    const locationPrefixes = ['tại', 'ở', 'đến', 'về', 'từ'];
    const vietnameseNamePattern = /(?:[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ][a-zàáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]+(?:\s+[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ][a-zàáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]+)+)/gu;

    const matches = input.content.matchAll(vietnameseNamePattern);
    for (const match of matches) {
      const name = match[0]!;
      const lower = name.toLowerCase();
      if (knownCharacters.has(lower) || knownBloodlines.has(lower) || knownLocations.has(lower)) {
        continue;
      }
      const idx = match.index!;
      const before = input.content.substring(Math.max(0, idx - 20), idx).toLowerCase();
      if (locationPrefixes.some(p => before.endsWith(p) || before.endsWith(p + ' '))) {
        issues.push(`Địa danh "${name}" không nằm trong danh sách known locations (phát hiện gần tiền vị từ chỉ nơi chốn).`);
      }
    }
    return { pass: issues.length === 0, issues };
  },
};
