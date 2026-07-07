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
  { pattern: /(^|[^\p{L}])lương(?=$|[^\p{L}])/iu, label: 'lương' },
  { pattern: /(^|[^\p{L}])lương thế nào(?=$|[^\p{L}])/iu, label: 'lương thế nào' },
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

const MODERN_PRONOUN_PATTERN = /(^|[^\p{L}])(tôi(?!\s+luyện)|anh(?!\s+(hùng|em))|(?<!(trẻ|anh)\s)em|cậu(?!\s+nhóc))(?=$|[^\p{L}])/iu;

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
      if (shouldRejectModernPronouns(input) && MODERN_PRONOUN_PATTERN.test(input.content)) {
        issues.push('Vi phạm xưng hô hiện đại không hợp bối cảnh: "tôi/anh/em/cậu".');
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

function shouldRejectModernPronouns(input: CheckInput): boolean {
  const storyOptions = input.context.hot.storyOptionsBlock.toLowerCase();
  const genreContract = input.context.hot.genreContract.toLowerCase();
  const combined = `${storyOptions}\n${genreContract}`;
  if (combined.includes('pov: ngôi nhất')) return false;
  if (combined.includes('world era: hiện đại')) return false;

  return (
    combined.includes('world era: cổ đại') ||
    combined.includes('world era: dị giới') ||
    combined.includes('cổ phong') ||
    combined.includes('pre-modern') ||
    combined.includes('tiền hiện đại')
  );
}
