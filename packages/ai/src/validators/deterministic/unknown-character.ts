import type { CheckInput, CheckResult, DeterministicCheck } from './types.ts';

export const unknownCharacterCheck: DeterministicCheck = {
  id: 'unknown_character',
  severity: 'medium',
  run(input: CheckInput): CheckResult {
    const issues: string[] = [];
    const knownNames = new Set(input.canon.knownCharacterNames.map(n => n.toLowerCase()));

    const vietnameseNamePattern = /(?:[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ][a-zàáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]+(?:\s+[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ][a-zàáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]+)+)/gu;

    const matches = input.content.matchAll(vietnameseNamePattern);
    for (const match of matches) {
      const name = match[0]!;
      if (!knownNames.has(name.toLowerCase())) {
        issues.push(`Nhân vật "${name}" không có trong danh sách known characters.`);
      }
    }
    return { pass: issues.length === 0, issues };
  },
};