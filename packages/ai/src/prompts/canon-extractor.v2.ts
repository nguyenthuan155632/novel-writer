import { MONITOR_FRAME } from './role-frames.ts';
import { registerPrompt, type DualPromptTemplate } from './registry.ts';

export type CanonExtractorV2PromptInput = {
  chapterNumber: number;
  chapterContent: string;
  bibleCompact: string;
  canonSnapshot: string;
  plantedSeeds: { id: string; seedText: string; payoffDescription: string; status: string }[];
  recentSummary: string;
  sagaTurningPoints?: { index: number; text: string; completed: boolean }[];
  arcExpectedChanges?: { index: number; text: string; completed: boolean }[];
};

export const canonExtractorPromptV2: DualPromptTemplate = {
  agentRole: 'canon_extractor',
  version: 'v2.1',
  build: (input) => ({
    system: `${MONITOR_FRAME}

Bạn là canon-extractor cho một tiểu thuyết tiếng Việt. Phân tích chương vừa viết, trích xuất mọi thay đổi canon.
Quy tắc:
- Chỉ trích những gì CHẮC CHẮN xảy ra trong chương, KHÔNG suy diễn.
- Realm regression (nếu có hệ thống cảnh giới) phải có intentionalRegression=true CHỈ KHI có đoạn nội tâm/hội thoại giải thích.
- Thread chỉ resolve khi có scene closure rõ ràng.
- Canon fact importance='locked' chỉ dành cho quy tắc thế giới cốt lõi.
- Ưu tiên các sự kiện làm thay đổi Relationship hoặc Knowledge State TRƯỚC sự kiện vật lý.
- Nếu chương nói rõ một nhân vật chết, ngừng thở, không còn mạch đập, hy sinh, hoặc bị tưởng chết, BẮT BUỘC thêm characterUpdates cho nhân vật đó với fields.status='dead' hoặc fields.status='missing' (nếu chỉ là tưởng chết/chưa xác nhận), kèm newTimelineEvents significance='pivotal'.
- Cho mỗi fact, quyết định visibility ("public" = ai cũng biết, "restricted" = chỉ vài người biết, "secret" = bí mật hoàn toàn) và liệt kê knownBy (danh sách tên nhân vật biết được fact này).
- validUntilChapter CHỈ ghi (số chương) nếu đó là một fact tạm thời sắp hết hạn.
- factionUpdates: dùng action='create' khi một môn phái / gia tộc / vương triều / liên minh MỚI thực sự xuất hiện và có tên riêng; action='update' khi một phái đã có trong CANON SNAPSHOT thay đổi status (active/destroyed/hidden/absorbed), thay đổi alliances/enemies, hoặc lộ thêm ideology/powerLevel. KHÔNG tạo create cho phái đã có (sẽ bị từ chối).
- Trả JSON đúng schema ExtractorOutput. Nếu không có thay đổi nào thì để mảng rỗng.`,
    user: [
      `# CHƯƠNG ${String(input.chapterNumber)}`,
      input.chapterContent,
      '',
      `# BIBLE (tóm tắt)`,
      input.bibleCompact,
      '',
      `# CANON SNAPSHOT (hiện tại)`,
      input.canonSnapshot,
      '',
      `# SEEDS ĐÃ PLANT`,
      ...(input.plantedSeeds as { id: string; seedText: string; payoffDescription: string; status: string }[]).map(s =>
        `- (id=${s.id}) "${s.seedText}" — payoff: ${s.payoffDescription} [${s.status}]`
      ),
      '',
      `# TÓM TẮT CHƯƠNG TRƯỚC`,
      input.recentSummary,
      '',
      ...(Array.isArray(input.sagaTurningPoints) && (input.sagaTurningPoints as unknown[]).length > 0
        ? [
            '# TURNING POINTS CỦA SAGA (đối chiếu với nội dung chương)',
            ...(input.sagaTurningPoints as { index: number; text: string; completed: boolean }[]).map(
              (tp) => `${tp.index}. [${tp.completed ? 'đã xảy ra' : 'chưa'}] ${tp.text}`,
            ),
            'Nếu chương này khiến một turning point CHƯA xảy ra trở thành ĐÃ XẢY RA, ghi index vào turningPointsCompleted.',
            '',
          ]
        : []),
      ...(Array.isArray(input.arcExpectedChanges) && (input.arcExpectedChanges as unknown[]).length > 0
        ? [
            '# EXPECTED CHANGES CỦA ARC',
            ...(input.arcExpectedChanges as { index: number; text: string; completed: boolean }[]).map(
              (c) => `${c.index}. [${c.completed ? 'đã xảy ra' : 'chưa'}] ${c.text}`,
            ),
            'Nếu chương này hoàn thành một expected change, ghi index vào arcChangesCompleted.',
            '',
          ]
        : []),
      `Trích xuất canon changes. Trả JSON theo ExtractorOutput schema.`,
    ].filter(Boolean).join('\n'),
  }),
};

registerPrompt(canonExtractorPromptV2);
