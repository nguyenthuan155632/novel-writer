export interface AntiPatternHit {
  code: string;
  severity: "low";
  message: string;
}

const FORBIDDEN_PHRASES: Array<{ code: string; pattern: RegExp; message: string }> = [
  { code: "anti_llm_instantly", pattern: /\blập tức\b/giu, message: 'Lạm dụng "lập tức".' },
  { code: "anti_llm_suddenly", pattern: /\bđột nhiên\b/giu, message: 'Lạm dụng "đột nhiên".' },
  { code: "anti_llm_could_not_help", pattern: /không khỏi (?:giật mình|kinh ngạc|sững sờ|chấn động)/giu, message: 'Cụm phản ứng cảm xúc rập khuôn.' },
  { code: "anti_llm_taking_deep_breath", pattern: /hít(?:\s+)?một(?:\s+)?hơi(?:\s+)?sâu/giu, message: 'Cụm hành động thừa "hít một hơi sâu".' },
  { code: "anti_llm_eyes_narrowed", pattern: /(?:nheo|híp) mắt/giu, message: 'Lặp mô tả mắt rập khuôn.' },
  { code: "anti_llm_corner_of_mouth", pattern: /khóe môi (?:cong|nhếch|khẽ cong)/giu, message: 'Lặp mô tả khóe môi rập khuôn.' },
  { code: "anti_llm_cold_snort", pattern: /lạnh lùng hừ(?:m)?/giu, message: 'Lặp phản ứng "hừ lạnh".' },
  { code: "anti_llm_body_stiff", pattern: /(?:toàn thân|cả người) (?:cứng đờ|khựng lại)/giu, message: 'Mô tả khựng/cứng đờ rập khuôn.' },
  { code: "anti_llm_heart_skip", pattern: /tim (?:khẽ )?(?:run|siết|thắt) lại/giu, message: 'Cụm cảm xúc tim lặp khuôn.' },
  { code: "anti_llm_in_the_air", pattern: /không khí (?:bỗng )?(?:trầm xuống|đông cứng|nặng nề)/giu, message: 'Mô tả không khí rập khuôn.' },
  { code: "anti_llm_was_silent", pattern: /rơi vào trầm mặc/giu, message: 'Cụm chuyển cảnh đối thoại rập khuôn.' },
  { code: "anti_llm_meanwhile", pattern: /cùng lúc đó|đúng lúc này/giu, message: 'Cụm chuyển cảnh máy móc.' },
  { code: "anti_llm_shock_wave", pattern: /chấn động lan ra/giu, message: 'Mô tả hiệu ứng lực lượng rập khuôn.' },
  { code: "anti_llm_unseen_pressure", pattern: /áp lực vô hình/giu, message: 'Cụm áp lực vô hình rập khuôn.' },
  { code: "anti_llm_pair_of_eyes", pattern: /một đôi mắt/giu, message: 'Mô tả "một đôi mắt" chung chung.' },
  { code: "anti_llm_after_all", pattern: /suy cho cùng|nói cho cùng/giu, message: 'Cụm kết luận sáo mòn.' },
];

const WRITING_RULES: Array<(content: string) => AntiPatternHit | null> = [
  (content) => repeatedParagraphStart(content),
  (content) => repeatedEllipsis(content),
  (content) => repeatedExclamation(content),
  (content) => excessiveAllCaps(content),
  (content) => repeatedCharacterName(content),
  (content) => repeatedSentenceTemplate(content),
  (content) => expositionDump(content),
  (content) => dialogueMonolith(content),
];

export function findAntiLlmPatternHits(content: string): AntiPatternHit[] {
  const hits: AntiPatternHit[] = [];

  for (const rule of FORBIDDEN_PHRASES) {
    if (rule.pattern.test(content)) {
      hits.push({ code: rule.code, severity: "low", message: rule.message });
    }
  }

  for (const rule of WRITING_RULES) {
    const hit = rule(content);
    if (hit) hits.push(hit);
  }

  return dedupeHits(hits);
}

function repeatedParagraphStart(content: string): AntiPatternHit | null {
  const starts = content
    .split(/\n{2,}/)
    .map((paragraph) => normalizeWords(paragraph).split(" ").slice(0, 3).join(" "))
    .filter((value) => value.length > 0);
  return hasDuplicate(starts)
    ? { code: "anti_llm_repeated_paragraph_start", severity: "low", message: "Nhiều đoạn mở đầu bằng cùng nhịp từ." }
    : null;
}

function repeatedEllipsis(content: string): AntiPatternHit | null {
  const matches = content.match(/\.\.\./g) ?? [];
  return matches.length >= 4
    ? { code: "anti_llm_ellipsis_overuse", severity: "low", message: "Lạm dụng dấu ba chấm." }
    : null;
}

function repeatedExclamation(content: string): AntiPatternHit | null {
  const matches = content.match(/!!+/g) ?? [];
  return matches.length >= 2
    ? { code: "anti_llm_exclamation_overuse", severity: "low", message: "Lạm dụng dấu chấm than kép." }
    : null;
}

function excessiveAllCaps(content: string): AntiPatternHit | null {
  const matches = content.match(/\b[A-ZĐ]{4,}\b/g) ?? [];
  return matches.length >= 3
    ? { code: "anti_llm_all_caps", severity: "low", message: "Có nhiều cụm in hoa gây gắt giọng." }
    : null;
}

function repeatedCharacterName(content: string): AntiPatternHit | null {
  const normalized = normalizeWords(content);
  const words = normalized.split(" ").filter((word) => word.length >= 2);
  for (let i = 0; i < words.length - 2; i += 1) {
    if (words[i] === words[i + 1] && words[i + 1] === words[i + 2]) {
      return { code: "anti_llm_repeated_name", severity: "low", message: "Tên hoặc từ khóa bị lặp liên tiếp." };
    }
  }
  return null;
}

function repeatedSentenceTemplate(content: string): AntiPatternHit | null {
  const firstClauses = content
    .split(/[.!?]\s+/)
    .map((sentence) => normalizeWords(sentence).split(" ").slice(0, 4).join(" "))
    .filter((value) => value.length > 0);
  return hasDuplicate(firstClauses)
    ? { code: "anti_llm_repeated_sentence_template", severity: "low", message: "Nhiều câu mở đầu cùng template." }
    : null;
}

function expositionDump(content: string): AntiPatternHit | null {
  const paragraphs = content.split(/\n{2,}/).map((paragraph) => paragraph.trim());
  const dump = paragraphs.find((paragraph) => paragraph.length >= 800 && !paragraph.includes('"'));
  return dump
    ? { code: "anti_llm_exposition_dump", severity: "low", message: "Có đoạn kể/chú giải dài dễ thành exposition dump." }
    : null;
}

function dialogueMonolith(content: string): AntiPatternHit | null {
  const lines = content.split("\n").map((line) => line.trim());
  const longDialogue = lines.find((line) => line.startsWith('"') && line.length >= 280);
  return longDialogue
    ? { code: "anti_llm_dialogue_monolith", severity: "low", message: "Có câu thoại quá dài, dễ thành độc thoại nặng tay." }
    : null;
}

function normalizeWords(content: string): string {
  return content
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasDuplicate(values: string[]): boolean {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return true;
    seen.add(value);
  }
  return false;
}

function dedupeHits(hits: AntiPatternHit[]): AntiPatternHit[] {
  const seen = new Set<string>();
  return hits.filter((hit) => {
    if (seen.has(hit.code)) return false;
    seen.add(hit.code);
    return true;
  });
}
