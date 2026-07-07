import type { CheckInput, CheckResult, DeterministicCheck } from './types.ts';
import { parseForbiddenRules } from '../utils.ts';

const MODERN_MEDIA_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bphim\b/i, label: 'phim' },
  { pattern: /\bđạo diễn\b/i, label: 'đạo diễn' },
  { pattern: /\bkịch bản\b/i, label: 'kịch bản' },
  { pattern: /\bdiễn viên\b/i, label: 'diễn viên' },
  { pattern: /(^|[^\p{L}])nhân vật phản diện(?=$|[^\p{L}])/iu, label: 'nhân vật phản diện' },
  { pattern: /(^|[^\p{L}])tiểu thuyết(?=$|[^\p{L}])/iu, label: 'tiểu thuyết' },
  { pattern: /(^|[^\p{L}])cốt truyện(?=$|[^\p{L}])/iu, label: 'cốt truyện' },
  { pattern: /\bsang chảnh\b/i, label: 'sang chảnh' },
  { pattern: /\bresort\b/i, label: 'resort' },
  { pattern: /\bfree\b/i, label: 'free' },
  { pattern: /\bclb\b/i, label: 'CLB' },
  { pattern: /\bclub\b/i, label: 'club' },
  { pattern: /\bvip\b/i, label: 'VIP' },
  { pattern: /\bstress\b/i, label: 'stress' },
  { pattern: /\bptsd\b/i, label: 'PTSD' },
  { pattern: /\bdilemma\b/i, label: 'dilemma' },
  { pattern: /(^|[^\p{L}])xì dầu(?=$|[^\p{L}])/iu, label: 'xì dầu' },
  { pattern: /(^|[^\p{L}])nước tương(?=$|[^\p{L}])/iu, label: 'nước tương' },
  { pattern: /(^|[^\p{L}])quảng cáo(?=$|[^\p{L}])/iu, label: 'quảng cáo' },
  { pattern: /(^|[^\p{L}])bánh kem(?=$|[^\p{L}])/iu, label: 'bánh kem' },
  { pattern: /\bokay\b/i, label: 'okay' },
  { pattern: /\buh\b/i, label: 'Uh' },
  { pattern: /\bjinx\b/i, label: 'jinx' },
  { pattern: /\btroll\b/i, label: 'troll' },
  { pattern: /\bvibe\b/i, label: 'vibe' },
  { pattern: /\bboss\b/i, label: 'boss' },
  { pattern: /\bsếp cuối\b/i, label: 'sếp cuối' },
  { pattern: /(^|[^\p{L}])cấp cuối(?=$|[^\p{L}])/iu, label: 'cấp cuối' },
  { pattern: /\bgps\b/i, label: 'GPS' },
  { pattern: /\bmarathon\b/i, label: 'marathon' },
  { pattern: /\bhiệu ứng\b/i, label: 'hiệu ứng' },
  { pattern: /(^|[^\p{L}])miễn phí(?=$|[^\p{L}])/iu, label: 'miễn phí' },
  { pattern: /(^|[^\p{L}])khử mùi(?=$|[^\p{L}])/iu, label: 'khử mùi' },
  { pattern: /(^|[^\p{L}])đăng ký hội viên(?=$|[^\p{L}])/iu, label: 'đăng ký hội viên' },
  { pattern: /(^|[^\p{L}])giảm giá(?=$|[^\p{L}])/iu, label: 'giảm giá' },
  { pattern: /(^|[^\p{L}])lãi suất(?=$|[^\p{L}])/iu, label: 'lãi suất' },
  { pattern: /(^|[^\p{L}])phần trăm(?=$|[^\p{L}])/iu, label: 'phần trăm' },
  { pattern: /(^|[^\p{L}])thế chấp(?=$|[^\p{L}])/iu, label: 'thế chấp' },
  { pattern: /(^|[^\p{L}])phiếu số thứ tự(?=$|[^\p{L}])/iu, label: 'phiếu số thứ tự' },
  { pattern: /(^|[^\p{L}])danh sách chờ(?=$|[^\p{L}])/iu, label: 'danh sách chờ' },
  { pattern: /(^|[^\p{L}])bảo hành(?=$|[^\p{L}])/iu, label: 'bảo hành' },
  { pattern: /(^|[^\p{L}])lịch hẹn(?=$|[^\p{L}])/iu, label: 'lịch hẹn' },
  { pattern: /(^|[^\p{L}])lịch trình(?=$|[^\p{L}])/iu, label: 'lịch trình' },
  { pattern: /(^|[^\p{L}])lịch nghỉ ngơi(?=$|[^\p{L}])/iu, label: 'lịch nghỉ ngơi' },
  { pattern: /(^|[^\p{L}])ngủ nướng(?=$|[^\p{L}])/iu, label: 'ngủ nướng' },
  { pattern: /(^|[^\p{L}])dịch vụ(?=$|[^\p{L}])/iu, label: 'dịch vụ' },
  { pattern: /(^|[^\p{L}])du lịch(?=$|[^\p{L}])/iu, label: 'du lịch' },
  { pattern: /(^|[^\p{L}])tour du lịch(?=$|[^\p{L}])/iu, label: 'tour du lịch' },
  { pattern: /(^|[^\p{L}])khách sạn(?=$|[^\p{L}])/iu, label: 'khách sạn' },
  { pattern: /(^|[^\p{L}])năm sao(?=$|[^\p{L}])/iu, label: 'năm sao' },
  { pattern: /\bminibar\b/i, label: 'minibar' },
  { pattern: /\btv\b/i, label: 'TV' },
  { pattern: /(^|[^\p{L}])phao cứu sinh(?=$|[^\p{L}])/iu, label: 'phao cứu sinh' },
  { pattern: /(^|[^\p{L}])review một sao(?=$|[^\p{L}])/iu, label: 'review một sao' },
  { pattern: /(^|[^\p{L}])đánh giá một sao(?=$|[^\p{L}])/iu, label: 'đánh giá một sao' },
  { pattern: /(^|[^\p{L}])hợp đồng(?=$|[^\p{L}])/iu, label: 'hợp đồng' },
  { pattern: /(^|[^\p{L}])công văn(?=$|[^\p{L}])/iu, label: 'công văn' },
  { pattern: /(^|[^\p{L}])dự án(?=$|[^\p{L}])/iu, label: 'dự án' },
  { pattern: /(^|[^\p{L}])gia hạn(?=$|[^\p{L}])/iu, label: 'gia hạn' },
  { pattern: /(^|[^\p{L}])ngày làm việc(?=$|[^\p{L}])/iu, label: 'ngày làm việc' },
  { pattern: /(^|[^\p{L}])đồng hồ báo thức(?=$|[^\p{L}])/iu, label: 'đồng hồ báo thức' },
  { pattern: /(^|[^\p{L}])bảo hiểm(?=$|[^\p{L}])/iu, label: 'bảo hiểm' },
  { pattern: /(^|[^\p{L}])tiền lương(?=$|[^\p{L}])/iu, label: 'tiền lương' },
  { pattern: /(^|[^\p{L}])lương thế nào(?=$|[^\p{L}])/iu, label: 'lương thế nào' },
  { pattern: /(^|[^\p{L}])hộ khẩu(?=$|[^\p{L}])/iu, label: 'hộ khẩu' },
  { pattern: /(^|[^\p{L}])không thu phí(?=$|[^\p{L}])/iu, label: 'không thu phí' },
  { pattern: /(^|[^\p{L}])thực đơn(?=$|[^\p{L}])/iu, label: 'thực đơn' },
  { pattern: /(^|[^\p{L}])quý khách(?=$|[^\p{L}])/iu, label: 'quý khách' },
  { pattern: /(^|[^\p{L}])trả góp(?=$|[^\p{L}])/iu, label: 'trả góp' },
  { pattern: /(^|[^\p{L}])chuyên nghiệp(?=$|[^\p{L}])/iu, label: 'chuyên nghiệp' },
  { pattern: /(^|[^\p{L}])cao cấp(?=$|[^\p{L}])/iu, label: 'cao cấp' },
  { pattern: /(^|[^\p{L}])nội thất(?=$|[^\p{L}])/iu, label: 'nội thất' },
  { pattern: /(^|[^\p{L}])hàng xịn(?=$|[^\p{L}])/iu, label: 'hàng xịn' },
  { pattern: /(^|[^\p{L}])giấy tờ tùy thân(?=$|[^\p{L}])/iu, label: 'giấy tờ tùy thân' },
  { pattern: /(^|[^\p{L}])vé vào cửa(?=$|[^\p{L}])/iu, label: 'vé vào cửa' },
  { pattern: /(^|[^\p{L}])chuẩn không cần chỉnh(?=$|[^\p{L}])/iu, label: 'chuẩn không cần chỉnh' },
  { pattern: /(^|[^\p{L}])giảm việc(?=$|[^\p{L}])/iu, label: 'giảm việc' },
  { pattern: /(^|[^\p{L}])ngược chiều kim đồng hồ(?=$|[^\p{L}])/iu, label: 'ngược chiều kim đồng hồ' },
  { pattern: /(^|[^\p{L}])tính năng(?=$|[^\p{L}])/iu, label: 'tính năng' },
  { pattern: /(^|[^\p{L}])nữ quyền(?=$|[^\p{L}])/iu, label: 'nữ quyền' },
  { pattern: /(^|[^\p{L}])kết thúc chương(?=$|[^\p{L}]|\d)/iu, label: 'kết thúc chương' },
  { pattern: /(^|[^\p{L}])kết thúc một arc(?=$|[^\p{L}])/iu, label: 'kết thúc một arc' },
  { pattern: /(^|[^\p{L}])arc(?=$|[^\p{L}])/iu, label: 'arc' },
  { pattern: /\bgodzilla\b/i, label: 'Godzilla' },
  { pattern: /(^|[^\p{L}])phiên bản(?=$|[^\p{L}])/iu, label: 'phiên bản' },
  { pattern: /(^|\n)\s*\*?\*?title\s*:/iu, label: 'TITLE header' },
  { pattern: /(^|\n)\s*#\s*(?:BIBLE|CANON SNAPSHOT|SEEDS|TÓM TẮT CHƯƠNG TRƯỚC|TURNING POINTS|EXPECTED CHANGES)\b/iu, label: 'context header leak' },
  { pattern: /(^|[^\p{L}])chờ xem chương(?=$|[^\p{L}]|\d)/iu, label: 'chờ xem chương' },
  { pattern: /(^|[^\p{L}])vết nứt thời gian(?=$|[^\p{L}])/iu, label: 'vết nứt thời gian' },
  { pattern: /(^|[^\p{L}])(trở về|quay về|xuyên về) quá khứ(?=$|[^\p{L}])/iu, label: 'trở về quá khứ' },
  { pattern: /(^|[^\p{L}])du hành thời gian(?=$|[^\p{L}])/iu, label: 'du hành thời gian' },
  { pattern: /(^|[^\p{L}])hả mày(?=$|[^\p{L}])/iu, label: 'hả mày' },
  { pattern: /(^|[^\p{L}])mày (đã|sẽ|phải|có thể|không thể)(?=$|[^\p{L}])/iu, label: 'mày' },
];

export function makeForbiddenMoveCheck(rulesText: string): DeterministicCheck {
  const keywords = parseForbiddenRules(rulesText);

  return {
    id: 'forbidden_move',
    severity: 'critical',
    run(input: CheckInput): CheckResult {
      const issues: string[] = [];
      const lower = input.content.toLowerCase();
      for (const keyword of keywords) {
        if (lower.includes(keyword.toLowerCase())) {
          issues.push(`Vi phạm forbidden rule: "${keyword}".`);
        }
      }
      for (const { pattern, label } of MODERN_MEDIA_PATTERNS) {
        if (pattern.test(input.content)) {
          issues.push(`Vi phạm thuật ngữ hiện đại không hợp bối cảnh: "${label}".`);
        }
      }
      if (
        isClassicalOrHistoricalContext(input) &&
        /(^|[^\p{L}])bánh mì(?=$|[^\p{L}])/iu.test(input.content)
      ) {
        issues.push('Vi phạm thuật ngữ hiện đại không hợp bối cảnh: "bánh mì".');
      }
      for (const issue of findCurrentChapterBoundaryViolations(input)) {
        issues.push(issue);
      }
      for (const issue of findFutureTurningPointViolations(input)) {
        issues.push(issue);
      }
      for (const issue of findLongPayoffSeedViolations(input)) {
        issues.push(issue);
      }
      if (hasModernMayPronounInDialogue(input.content)) {
        issues.push('Vi phạm thuật ngữ hiện đại không hợp bối cảnh: "mày".');
      }
      if (hasUnbalancedVietnameseDialogueQuotes(input.content)) {
        issues.push('Lỗi hình thức thoại: dấu ngoặc kép tiếng Việt không cân bằng.');
      }
      return { pass: issues.length === 0, issues };
    },
  };
}

function findFutureTurningPointViolations(input: CheckInput): string[] {
  const sagaText = input.context.warm.sagaSummary ?? "";
  const currentChapter = input.chapter.chapterNumber;
  const content = normalizeVietnameseForMatch(input.content);
  const issues: string[] = [];
  const tpPattern = /(?:^|\n)\s*(?:\d+\.\s*)?([^\n]+?)\s*\(chương\s*(\d+)\)/giu;
  let match: RegExpExecArray | null;

  while ((match = tpPattern.exec(sagaText)) !== null) {
    const text = match[1]?.trim() ?? "";
    const plannedChapter = Number(match[2]);
    if (!Number.isFinite(plannedChapter) || plannedChapter <= currentChapter) {
      continue;
    }
    const anchor = futureTurningPointAnchor(text);
    if (!anchor) continue;
    const normalizedAnchor = normalizeVietnameseForMatch(anchor);
    const isDiscoveryPlan = isFutureDiscoveryPlan(text);
    if (!isDiscoveryPlan && normalizedAnchor.length >= 4 && content.includes(normalizedAnchor)) {
      issues.push(
        `Vi phạm turning point tương lai: "${anchor}" xuất hiện ở chương ${currentChapter} trước mốc chương ${plannedChapter}.`,
      );
    }
  }

  return issues;
}

function findLongPayoffSeedViolations(input: CheckInput): string[] {
  const currentChapter = input.chapter.chapterNumber;
  const content = normalizeVietnameseForMatch(input.content);
  const issues: string[] = [];
  const seeds = input.context.warm.arcPlantedSeeds ?? [];

  for (const seed of seeds) {
    if (seed.payoffChapter == null || seed.payoffChapter <= currentChapter) continue;
    const seedPlan = `${seed.seedText}\n${seed.payoffDescription}`;
    if (!isFutureDiscoveryPlan(seedPlan)) continue;
    if (!hasPrematureDiscoveryPayoff(content)) continue;
    issues.push(
      `Vi phạm payoff seed dài hạn: nội dung đã biến seed "${seed.seedText}" thành khám phá/vật chứng trước mốc payoff chương ${seed.payoffChapter}.`,
    );
  }

  return issues;
}

function futureTurningPointAnchor(text: string): string | null {
  const normalized = text
    .replace(/\s*[-:–—]\s*.*/u, "")
    .replace(/\s+/g, " ")
    .trim();
  const rules: Array<{ pattern: RegExp; group?: number }> = [
    { pattern: /^gặp\s+(.+)$/iu },
    { pattern: /^tìm\s+thấy\s+(.+?)(?:\s+trong|\s+ở|$)/iu },
    { pattern: /^tìm\s+ra\s+(.+?)(?:\s+dưới|\s+trong|\s+ở|$)/iu },
    { pattern: /^bước\s+chân\s+xuống\s+(.+)$/iu },
    { pattern: /^biết\s+về\s+(.+)$/iu },
    { pattern: /^bị\s+(.+)$/iu },
    { pattern: /^đụng\s+độ\s+trực\s+diện\s+với\s+(.+)$/iu },
    { pattern: /^mở\s+(.+)$/iu },
    { pattern: /^đối\s+thoại\s+với\s+(.+)$/iu },
    { pattern: /^giải\s+mã\s+(.+)$/iu },
  ];

  for (const { pattern, group = 1 } of rules) {
    const match = normalized.match(pattern);
    const anchor = match?.[group]?.trim();
    if (anchor) return anchor;
  }

  return null;
}

function isFutureDiscoveryPlan(text: string): boolean {
  const normalized = normalizeVietnameseForMatch(text);
  const hasDiscoveryIntent =
    /\b(tim thay|tim ra|phat hien|kham pha|mo|giai ma|doc duoc|lat mo)\b/u.test(
      removeVietnameseDiacritics(normalized),
    );
  if (!hasDiscoveryIntent) return false;

  return /\b(so|sach|thu|giay|tai lieu|ho so|nhat ky|van ban|ban ghi|khe uoc|bien ban|ban do|vat chung|di vat|dau tich)\b/u.test(
    removeVietnameseDiacritics(normalized),
  );
}

function hasPrematureDiscoveryPayoff(normalizedContent: string): boolean {
  const plain = removeVietnameseDiacritics(normalizedContent);
  const hasDiscoveryAction =
    /\b(tim thay|tim ra|phat hien|lo ra|mo ra|lay ra|trai len|giau trong|cat giau|an giau)\b/u.test(
      plain,
    );
  const hasEvidenceArtifact =
    /\b(so|sach|thu|to giay|giay cu|tap giay|tai lieu|ho so|nhat ky|van ban|ban ghi|goi vai|khe uoc|bien ban|ban do|vat chung|di vat|dau tich)\b/u.test(
      plain,
    );
  const hasHiddenOrArchiveFrame =
    /\b(ngan bi mat|buc tuong|vet nut|trong vach|sau tuong|duoi nen|hom|ruong|niem phong|cat giau|an giau|goi vai)\b/u.test(
      plain,
    );

  return hasDiscoveryAction && hasEvidenceArtifact && hasHiddenOrArchiveFrame;
}

function removeVietnameseDiacritics(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function normalizeVietnameseForMatch(value: string): string {
  return value
    .toLocaleLowerCase("vi-VN")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findCurrentChapterBoundaryViolations(input: CheckInput): string[] {
  const packet = input.context.cold.packet;
  const purpose = (packet?.chapterPurpose ?? "").toLocaleLowerCase("vi-VN");
  const endingMode = (packet?.endingMode ?? "").toLocaleLowerCase("vi-VN");
  const forbiddenText = (packet?.forbiddenMoves ?? []).join("\n").toLocaleLowerCase("vi-VN");
  const isQuietSetup =
    input.chapter.chapterNumber <= 2 &&
    ["slice_of_life", "worldbuilding", "relationship", "aftermath"].includes(purpose) &&
    ["quiet_transition", "resolved", "emotional_aftertaste", "comic_beat"].includes(endingMode);
  if (!isQuietSetup) return [];
  if (!/(chữ|nợ|người mất|người đã mất|huyền bí|bí mật|vật chứng|lời cảnh báo|điều tra)/iu.test(forbiddenText)) {
    return [];
  }

  const patterns: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /(^|[^\p{L}])chữ\s+tự\s+đổi(?=$|[^\p{L}])/iu, label: "chữ tự đổi" },
    { pattern: /(^|[^\p{L}])(?:nợ\s+cũ|món\s+nợ|nợ\s+của\s+người|nợ\s+trong\s+sổ|nợ\s+trên\s+giấy)(?=$|[^\p{L}])/iu, label: "nợ cũ" },
    { pattern: /(^|[^\p{L}])người\s+(?:đã\s+)?mất(?:\s+trong\s+sổ|\s+trên\s+giấy|\s+đòi\s+nợ)(?=$|[^\p{L}])/iu, label: "người đã mất gắn với manh mối" },
    { pattern: /(^|[^\p{L}])mất\s+tích(?=$|[^\p{L}])/iu, label: "mất tích" },
    { pattern: /(^|[^\p{L}])thầy\s+pháp(?=$|[^\p{L}])/iu, label: "thầy pháp" },
    { pattern: /(^|[^\p{L}])vật\s+chứng(?=$|[^\p{L}])/iu, label: "vật chứng" },
    { pattern: /(^|[^\p{L}])lời\s+cảnh\s+báo(?=$|[^\p{L}])/iu, label: "lời cảnh báo" },
    { pattern: /(^|[^\p{L}])điều\s+tra(?=$|[^\p{L}])/iu, label: "điều tra" },
    { pattern: /(^|[^\p{L}])căn\s+cước(?=$|[^\p{L}])/iu, label: "căn cước" },
    { pattern: /(^|[^\p{L}])lên\s+phường(?=$|[^\p{L}])/iu, label: "lên phường" },
  ];

  return patterns
    .filter(({ pattern }) => pattern.test(input.content))
    .map(({ label }) => `Vi phạm ranh giới chương hiện tại: "${label}" xuất hiện dù packet đang là setup đời sống và forbiddenMoves đã cấm reveal/điều tra sớm.`);
}

function isClassicalOrHistoricalContext(input: CheckInput): boolean {
  const text = [
    input.context.hot.storyOptionsBlock,
    input.context.hot.genreContract,
    input.context.hot.systemRules,
    input.context.hot.styleGuide,
  ]
    .filter(Boolean)
    .join("\n")
    .toLocaleLowerCase("vi-VN");

  return [
    "world era: cổ đại",
    "cổ đại",
    "cổ trang",
    "cổ phong",
    "dị giới",
    "phong kiến",
  ].some((marker) => text.includes(marker));
}

function hasModernMayPronounInDialogue(content: string): boolean {
  const quotedSegments = content.match(/"[^"\n]*"|“[^”\n]*”/gu) ?? [];
  return quotedSegments.some((segment) =>
    /(^|[^\p{L}])mày(?=$|[^\p{L}])/iu.test(stripLexicalMayUses(segment)),
  );
}

function stripLexicalMayUses(content: string): string {
  return content
    .replace(/mặt\s+nặng\s+mày\s+nhẹ/giu, "")
    .replace(/(?:nhíu|cau|nhướn|nhướng)\s+mày/giu, "");
}

function hasUnbalancedVietnameseDialogueQuotes(content: string): boolean {
  const openQuotes = content.match(/“/g)?.length ?? 0;
  const closeQuotes = content.match(/”/g)?.length ?? 0;
  return openQuotes !== closeQuotes;
}
