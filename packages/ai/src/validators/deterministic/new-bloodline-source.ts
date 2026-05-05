import type { CheckInput, CheckResult, DeterministicCheck } from './types.ts';

export const newBloodlineSourceCheck: DeterministicCheck = {
  id: 'new_bloodline_source',
  severity: 'low',
  run(input: CheckInput): CheckResult {
    const issues: string[] = [];
    const knownBloodlines = new Set(input.canon.knownBloodlineNames.map(n => n.toLowerCase()));
    const bloodlineKeywords = ['huyết mạch', 'huyết mạch của', 'mang huyết mạch', 'thừa hưởng huyết mạch', 'huyết thống'];

    for (const keyword of bloodlineKeywords) {
      const parts = input.content.split(keyword);
      for (let i = 1; i < parts.length; i++) {
        const after = parts[i]!.substring(0, 40).trim();
        const nameMatch = after.match(/^([A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ][a-zàáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ\s]+?)(?:\s*[,.:;!? моя]|\s*$)/u);
        if (nameMatch) {
          const bloodlineName = nameMatch[1]!.trim();
          if (!knownBloodlines.has(bloodlineName.toLowerCase())) {
            issues.push(`Huyết mạch "${bloodlineName}" chưa có trong danh sách known bloodlines.`);
          }
        }
      }
    }
    return { pass: issues.length === 0, issues };
  },
};
