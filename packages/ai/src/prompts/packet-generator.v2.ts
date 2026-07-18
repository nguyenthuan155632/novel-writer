import type { GenreDef, PersonalityDef, StoryOptions } from "@novel/core";
import { registerPrompt, type DualPromptTemplate } from "./registry.ts";
import { renderGenreContract } from "./contracts/genre-contract.ts";
import { renderPersonalityContract } from "./contracts/personality-contract.ts";
import { buildStoryOptionsBlock } from "./contracts/story-options-block.ts";

export type PacketGeneratorV2PromptInput = {
  bibleCompact: string;
  arcSummary: string;
  recentChapterSummaries: { chapterNumber: number; summary: string }[];
  activeCharacters: {
    name: string;
    currentRealm?: string;
    status: string;
    faction?: string;
  }[];
  openThreads: { title: string; state: string }[];
  duePlantedSeeds: {
    id: string;
    seedText: string;
    payoffDescription: string;
    plantWindowEnd: number;
  }[];
  overdueThreads: { title: string; introducedChapter: number }[];
  /** §1.9 — seeds approaching plantWindowEnd (within 2 chapters). Auto-enforced at critical priority. */
  mustIncludeSeeds?: { id: string; seedText: string; plantWindowEnd: number }[];
  prevChapterTailContent?: string;
  knowledgeState?: Record<string, number>;
  forbiddenRules: string;
  chapterNumber: number;
  arcGoals: string;
  realmLadder?: readonly string[];
  genreDef: GenreDef;
  personalityDef: PersonalityDef;
  storyOptions: StoryOptions;
};

export const packetGeneratorPromptV2: DualPromptTemplate = {
  agentRole: "packet_generator",
  version: "v2",
  build: (input) => {
    const genreDef = input.genreDef as GenreDef;
    const personalityDef = input.personalityDef as PersonalityDef;
    const storyOptions = (input.storyOptions ?? {}) as StoryOptions;
    const recent = input.recentChapterSummaries as {
      chapterNumber: number;
      summary: string;
    }[];
    const chars = input.activeCharacters as {
      name: string;
      currentRealm?: string;
      status: string;
      faction?: string;
    }[];
    const threads = input.openThreads as { title: string; state: string }[];
    const seeds = input.duePlantedSeeds as {
      id: string;
      seedText: string;
      payoffDescription: string;
      plantWindowEnd: number;
    }[];
    const overdue = input.overdueThreads as {
      title: string;
      introducedChapter: number;
    }[];
    const prevTail = input.prevChapterTailContent;
    const mustIncludeSeeds = (input.mustIncludeSeeds ?? []) as {
      id: string;
      seedText: string;
      plantWindowEnd: number;
    }[];

    return {
      system: `Bạn là planner chương cho tiểu thuyết ${genreDef.viLabel} tiếng Việt. Trả JSON đúng schema. KHÔNG viết nội dung chương — chỉ kế hoạch.

${renderGenreContract(genreDef, storyOptions)}

${renderPersonalityContract(personalityDef)}

${buildStoryOptionsBlock({ storyOptions, target: "packet" })}`,
      user: [
        `# NỐI TIẾP CHƯƠNG TRƯỚC`,
        prevTail ? `Đoạn cuối chương trước:\n"${prevTail}"\n\n(Kế hoạch chương này PHẢI bắt đầu nối tiếp mạch cảm xúc/hành động từ đoạn trên)` : "",
        "",
        `# BIBLE`,
        input.bibleCompact,
        "",
        `# ARC HIỆN TẠI`,
        input.arcSummary,
        "",
        `# ARC GOALS`,
        input.arcGoals,
        "",
        `# 5 CHƯƠNG GẦN NHẤT`,
        ...recent.map((s) => `- Ch${s.chapterNumber}: ${s.summary}`),
        "",
        `# NHÂN VẬT ĐANG HOẠT ĐỘNG`,
        ...chars.map(
          (c) =>
            `- ${c.name} [${c.status}] realm=${c.currentRealm ?? "-"} faction=${c.faction ?? "-"}`,
        ),
        "",
        // Inject power progression ladder when available
        ...((input.realmLadder as readonly string[] | undefined)?.length
          ? [
              `# POWER PROGRESSION (thấp → cao)`,
              (input.realmLadder as readonly string[]).join(" → "),
              "",
            ]
          : []),
        `# THREADS ĐANG MỞ`,
        ...threads.map((t) => `- ${t.title} [${t.state}]`),
        "",
        `# SEEDS CÓ THỂ GIEO TỪ CHƯƠNG NÀY`,
        ...seeds.map(
          (s) =>
            `- (id=${s.id}) có thể plant nếu tự nhiên: "${s.seedText}" — pays off: ${s.payoffDescription} — window ends ch${s.plantWindowEnd}`,
        ),
        "",
        // §1.9 — critical auto-enforced seeds approaching deadline
        ...(mustIncludeSeeds.length > 0
          ? [
              `<must_include_seeds priority="critical">`,
              `BẮT BUỘC TUYỆT ĐỐI — các seed sau PHẢI xuất hiện trong requiredEvents của chương này (đã qua deadline -2):`,
              ...mustIncludeSeeds.map(
                (s) =>
                  `- seedId="${s.id}" plantWindowEnd=ch${s.plantWindowEnd}: "${s.seedText}"`,
              ),
              `</must_include_seeds>`,
              "",
            ]
          : []),
        overdue.length > 0 ? `# THREAD QUÁ HẠN — cần resolve sớm:` : "",
        ...overdue.map((t) => `- ${t.title} (intro ch${t.introducedChapter})`),
        "",
        `# CẤM`,
        input.forbiddenRules,
        "",
        `# YÊU CẦU`,
        `Lập kế hoạch chương ${String(input.chapterNumber)}. BÁM ĐÚNG GENRE CONTRACT và PERSONALITY CONTRACT ở trên.`,
        `BẮT BUỘC: conflict phải rõ ở mức chương, nhưng conflict có thể nhỏ/đời thường/nội tâm nếu chapterPurpose là slice_of_life, aftermath, relationship, training, hoặc worldbuilding.`,
        `KHÔNG bắt buộc cliffhanger; cliffhanger chỉ là tùy chọn khi endingMode thật sự cần escalation/ominous_hook. Chương dài tập có thể kết trọn, kết lặng, kết hài, hoặc chuyển cảnh mềm.`,
        `MỞ ĐẦU TIỂU THUYẾT DÀI TẬP: chỉ chương 1-2, nếu không có <must_include_seeds>, ưu tiên thiết lập nhịp sống bình thường trước biến cố lớn. Conflict có thể là việc thường ngày, quan hệ nhỏ, trách nhiệm nghề nghiệp hoặc bất an rất mơ hồ. Không bắt buộc có manh mối trong từng chương mở đầu.`,
        `CHƯƠNG 1-2 BASELINE: nếu không có <must_include_seeds>, conflict và requiredEvents PHẢI thuần đời sống/nghề nghiệp/quan hệ nhỏ/không khí. KHÔNG nhắc chuyện cũ dưới sông, nợ cũ, người đã khuất, chữ lạ, vật chứng, lời cảnh báo, điều tra, hoặc gặp nhân vật giữ bí mật. Những thứ đó để cho turning point/arc change sau.`,
        `TỪ CHƯƠNG 3: mỗi packet PHẢI tạo ít nhất một thay đổi trạng thái cụ thể và mới so với 5 chương gần nhất: mục tiêu, quan hệ, thông tin nhân vật biết, nguồn lực, vị trí, cam kết, trở ngại, hoặc hậu quả. Tin đồn lặp lại, một kẻ lạ xuất hiện rồi bị đuổi, hoặc nhân vật nghe lại thông tin cũ không phải thay đổi trạng thái.`,
        `CHỐNG LẶP NHỊP: đọc # 5 CHƯƠNG GẦN NHẤT trước khi chọn goal và requiredEvents. Không lặp lại chuỗi mở đầu/thói quen, địa điểm, kiểu khách lạ, cách xử lý conflict, hay kiểu kết của hai chương gần nhất. Một thói quen (thức dậy, tắm rửa, mua đồ, nghỉ ngơi) chỉ được dùng như một beat ngắn khi nó trực tiếp làm thay đổi trạng thái; không được vừa mở đầu vừa kết thúc chương.`,
        `NỐI CHƯƠNG BẮT BUỘC: từ chương 2, requiredEvents[0] phải bắt đầu từ thời điểm, địa điểm, hành động hoặc hệ quả ở # NỐI TIẾP CHƯƠNG TRƯỚC. KHÔNG mặc định nhảy sang sáng hôm sau, cho nhân vật thức dậy, mở mắt, tắm rửa hoặc bắt đầu một ngày mới. Chỉ được chuyển ngày khi thực sự cần cho nhân quả; khi đó notes PHẢI bắt đầu bằng "TIME_SKIP: " và nêu rõ lý do cùng hệ quả mới của việc chuyển thời gian.`,
        `MYSTERY_SETUP ĐẦU ARC: sau khi một manh mối chính vừa xuất hiện, các chương setup kế tiếp nên khai thác hệ quả đời thường, quan hệ, lời kể mơ hồ, thói quen nghề nghiệp, sai lệch nhỏ trong cảm xúc/không khí. KHÔNG tự thêm vật chứng mới, máu, dấu theo dõi, bóng người rình rập, tiếng gọi siêu nhiên, hoặc manh mối độc lập khác trừ khi đó là <must_include_seeds> hoặc turning point hiện tại.`,
        `NHẤT QUÁN PURPOSE/ENDING: nếu chọn chapterPurpose slice_of_life/aftermath/worldbuilding hoặc endingMode quiet_transition/emotional_aftertaste/resolved, requiredEvents phải thật sự là đời sống/hậu quả/không khí. KHÔNG đưa cảnh nhân vật tự đi rình, theo dõi ban đêm, bám dấu, kiểm tra miếu hoang, gặp bóng người, hoặc mở vật chứng rồi vẫn gọi là quiet/slice.`,
        `KHÔNG KÉO TURNING POINT TƯƠNG LAI VỀ SỚM: nếu turning point/arc change được ghi cho chương sau, không đưa vật chứng, reveal, cuộc gặp, điều tra, chữ lạ, nợ cũ, cái chết cũ hoặc lời cảnh báo vào conflict/requiredEvents trước khi packet thật sự tới mốc đó hoặc must_include_seeds yêu cầu.`,
        `SEED MỀM: seed chưa tới hạn chỉ nên xuất hiện như chi tiết nền tự nhiên (vật nhỏ, lời nói thoáng qua, thói quen, địa điểm), không được tự biến thành biến cố chính hoặc chuỗi reveal trong cùng chương.`,
        `BẮT BUỘC thêm chapterPurpose: một nhãn ngắn mô tả chức năng chương, ví dụ slice_of_life, aftermath, relationship, worldbuilding, training, mystery_setup, plot_progression, action, reveal, climax.`,
        `BẮT BUỘC thêm endingMode: một nhãn ngắn mô tả kiểu kết chương, ví dụ resolved, quiet_transition, emotional_aftertaste, open_question, comic_beat, escalation, ominous_hook.`,
        `Chỉ các seed trong <must_include_seeds> mới bắt buộc vào requiredEvents. Các seed ở mục "# SEEDS CÓ THỂ GIEO" chỉ nên dùng khi tự nhiên với chapterPurpose; nếu dùng thì gắn đúng seedId. NẾU KHÔNG có seedId dạng UUID từ các mục seed, TUYỆT ĐỐI KHÔNG tự bịa seedId (bỏ trống trường seedId).`,
        `GIỚI HẠN ĐỘ DÀI: goal <= 500 ký tự; conflict <= 500; cliffhanger nếu có <= 500; chapterPurpose/endingMode <= 80; mỗi requiredEvents.description <= 500.`,
        `Viết ngắn gọn, trọn ý, không lặp.`,
        `Hài hước phải hợp thế giới dị giới/cổ phong; KHÔNG đưa sản phẩm, dịch vụ, thuật ngữ sinh hoạt hiện đại như khử mùi, đăng ký hội viên, giảm giá, lịch hẹn vào plan trừ khi canon cho phép.`,
        `forbiddenMoves: liệt kê những đòn từ # CẤM mà chương này nên tránh dùng.`,
        `Trả về JSON theo schema ChapterPacket.`,
        `BẮT BUỘC: phải thiết lập entryState. Kế thừa từ summary chương trước + logic nhân vật. KHÔNG TỰ BỊA.`,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  },
};

registerPrompt(packetGeneratorPromptV2);
