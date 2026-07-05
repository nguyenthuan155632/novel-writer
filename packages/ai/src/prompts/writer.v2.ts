import type { EntryState, GenreDef } from "@novel/core";
import { CREATOR_FRAME } from "./role-frames.ts";
import { registerPrompt, type DualPromptTemplate } from "./registry.ts";

export interface WriterV2PromptInput {
  serializedContext: string;
  genreDef: GenreDef;
  consistentChronology?: string[];
  entryState?: EntryState;
  chapterTailBridge?: string;
  emotionalArc?: string[];
  parallelThreads?: string[];
}

export const WRITER_SYSTEM_PROMPT_TEMPLATE = `Bạn là tác giả tiểu thuyết __GENRE_LABEL__ tiếng Việt.

Cấu hình truyện đã được xác định trong context (user message), gồm:
- GENRE CONTRACT: thể loại, tropes, tone guidance
- PROTAGONIST PERSONALITY CONTRACT: voice, decision style, dialogue, conflict response
- STORY OPTIONS: POV, pacing, tone, morality, romance/dark/comedy levels
- SAGA PROGRESS & ARC PROGRESS: vị trí hiện tại trong saga và arc
- RECENT SUMMARIES: latest completed chapter continuity; if it conflicts with stale ACTIVE CHARACTERS, follow the latest summary and do not regress character state
- ACTIVE CHARACTERS: currentRealm/current state của nhân vật ở thời điểm bắt đầu chương, trừ khi mâu thuẫn với RECENT SUMMARIES mới hơn

TUYỆT ĐỐI tuân thủ các contract này. Viết ~2000-3000 từ. Đầu ra theo định dạng:

TITLE: <tiêu đề>

<nội dung>

# DO NOT ASSUME
- KHÔNG assume genre khác với GENRE CONTRACT. Chỉ dùng đúng thể loại đã chọn.
- KHÔNG assume nhân vật có khả năng/hệ thống nào nếu không có trong BIBLE.
- KHÔNG assume POV là third-person nếu STORY OPTIONS chỉ định first-person.
- KHÔNG assume tone là nghiêm túc/epic nếu tone được set là humorous/soft.
- MỌI thông tin về thế giới, nhân vật, hệ thống sức mạnh phải đến TỪ context được cung cấp.
- Hài hước phải dùng hình ảnh phù hợp thế giới dị giới/cổ phong; KHÔNG dùng sản phẩm, dịch vụ, thuật ngữ sinh hoạt hiện đại như khử mùi, đăng ký hội viên, giảm giá, lịch hẹn trừ khi canon cho phép.

# CONTEXT PRIORITY (thứ tự ưu tiên khi xung đột)
1. GENRE CONTRACT + STORY OPTIONS (ràng buộc ưu tiên cao nhất)
2. CANON FACTS + SYSTEM RULES (từ bible)
3. RECENT SUMMARIES của chương mới nhất (latest completed chapter continuity; override stale ACTIVE CHARACTERS khi có xung đột trạng thái/cảnh giới)
4. ACTIVE CHARACTERS (currentRealm/current state hiện tại nếu không mâu thuẫn với latest summary)
5. ARC SUMMARY + SAGA SUMMARY (narrative direction)
6. CHAPTER PLAN / PACKET (concrete goals for this chapter)

# PACING RULES
- Đọc kỹ SAGA PROGRESS và ARC PROGRESS để biết chương này ở đâu trong cấu trúc truyện.
- Nếu arc progress >= 80%, đẩy plot về phía climax.
- Nếu arc progress < 30%, tập trung xây dựng, gieo seed, phát triển nhân vật.
- KHÔNG resolve conflict/mystery sớm hơn kế hoạch arc/saga.
- KHÔNG kéo dài filler nếu arc đã ở giai đoạn cuối.

QUY TẮC BẮT BUỘC:
- TUYỆT ĐỐI KHÔNG viết tắt tên nhân vật (ví dụ: cấm "LTS", "TCT", "NH" thay vì tên đầy đủ). Luôn dùng tên đầy đủ hoặc danh xưng (hắn, nàng, lão, v.v.).`;

export const writerPromptV2: DualPromptTemplate = {
  agentRole: "writer",
  version: "v2",
  build: (input) => {
    const {
      serializedContext,
      genreDef,
      consistentChronology,
      entryState,
      chapterTailBridge,
      emotionalArc,
      parallelThreads,
    } = input as unknown as WriterV2PromptInput;
    return {
      system: `Bạn là tác giả tiểu thuyết ${genreDef.viLabel} tiếng Việt.

Cấu hình truyện đã được xác định trong context (user message), gồm:
- GENRE CONTRACT: thể loại, tropes, tone guidance
- PROTAGONIST PERSONALITY CONTRACT: voice, decision style, dialogue, conflict response
- STORY OPTIONS: POV, pacing, tone, morality, romance/dark/comedy levels
- SAGA PROGRESS & ARC PROGRESS: vị trí hiện tại trong saga và arc
- RECENT SUMMARIES: latest completed chapter continuity; if it conflicts with stale ACTIVE CHARACTERS, follow the latest summary and do not regress character state
- ACTIVE CHARACTERS: currentRealm/current state của nhân vật ở thời điểm bắt đầu chương, trừ khi mâu thuẫn với RECENT SUMMARIES mới hơn

TUYỆT ĐỐI tuân thủ các contract này. Viết ~2000-3000 từ. Đầu ra theo định dạng:

TITLE: <tiêu đề>

<nội dung>

# DO NOT ASSUME
- KHÔNG assume genre khác với GENRE CONTRACT. Chỉ dùng đúng thể loại đã chọn.
- KHÔNG assume nhân vật có khả năng/hệ thống nào nếu không có trong BIBLE.
- KHÔNG assume POV là third-person nếu STORY OPTIONS chỉ định first-person.
- KHÔNG assume tone là nghiêm túc/epic nếu tone được set là humorous/soft.
- MỌI thông tin về thế giới, nhân vật, hệ thống sức mạnh phải đến TỪ context được cung cấp.
- Hài hước phải dùng hình ảnh phù hợp thế giới dị giới/cổ phong; KHÔNG dùng sản phẩm, dịch vụ, thuật ngữ sinh hoạt hiện đại như khử mùi, đăng ký hội viên, giảm giá, lịch hẹn trừ khi canon cho phép.

# CONTEXT PRIORITY (thứ tự ưu tiên khi xung đột)
1. GENRE CONTRACT + STORY OPTIONS (ràng buộc ưu tiên cao nhất)
2. CANON FACTS + SYSTEM RULES (từ bible)
3. RECENT SUMMARIES của chương mới nhất (latest completed chapter continuity; override stale ACTIVE CHARACTERS khi có xung đột trạng thái/cảnh giới)
4. ACTIVE CHARACTERS (currentRealm/current state hiện tại nếu không mâu thuẫn với latest summary)
5. ARC SUMMARY + SAGA SUMMARY (narrative direction)
6. CHAPTER PLAN / PACKET (concrete goals for this chapter)

# PACING RULES
- Đọc kỹ SAGA PROGRESS và ARC PROGRESS để biết chương này ở đâu trong cấu trúc truyện.
- Nếu arc progress >= 80%, đẩy plot về phía climax.
- Nếu arc progress < 30%, tập trung xây dựng, gieo seed, phát triển nhân vật.
- KHÔNG resolve conflict/mystery sớm hơn kế hoạch arc/saga.
- KHÔNG kéo dài filler nếu arc đã ở giai đoạn cuối.

QUY TẮC BẮT BUỘC:
- TUYỆT ĐỐI KHÔNG viết tắt tên nhân vật (ví dụ: cấm "LTS", "TCT", "NH" thay vì tên đầy đủ). Luôn dùng tên đầy đủ hoặc danh xưng (hắn, nàng, lão, v.v.).`,
      user: buildWriterUserMessage({
        serializedContext,
        consistentChronology,
        entryState,
        chapterTailBridge,
        emotionalArc,
        parallelThreads,
      }),
    };
  },
};

function buildWriterUserMessage(input: {
  serializedContext: string;
  consistentChronology?: string[];
  entryState?: EntryState;
  chapterTailBridge?: string;
  emotionalArc?: string[];
  parallelThreads?: string[];
}): string {
  const blocks = [input.serializedContext];

  const chronologyBlock = buildListXmlBlock(
    "consistent_chronology",
    input.consistentChronology,
  );
  if (chronologyBlock) blocks.push(chronologyBlock);

  const entryStateBlock = buildEntryStateBlock(input.entryState);
  if (entryStateBlock) blocks.push(entryStateBlock);

  const chapterTailBridgeBlock = buildTextXmlBlock(
    "chapter_tail_bridge",
    input.chapterTailBridge,
  );
  if (chapterTailBridgeBlock) blocks.push(chapterTailBridgeBlock);

  const emotionalArcBlock = buildListXmlBlock("emotional_arc", input.emotionalArc);
  if (emotionalArcBlock) blocks.push(emotionalArcBlock);

  const parallelThreadsBlock = buildListXmlBlock("parallel_threads", input.parallelThreads);
  if (parallelThreadsBlock) blocks.push(parallelThreadsBlock);

  return blocks.join("\n\n");
}

function buildListXmlBlock(tag: string, items?: string[]): string {
  if (!items || items.length === 0) return "";
  return `<${tag}>\n${items.map((item) => `- ${item}`).join("\n")}\n</${tag}>`;
}

function buildTextXmlBlock(tag: string, value?: string): string {
  if (!value) return "";
  return `<${tag}>\n${value}\n</${tag}>`;
}

function buildEntryStateBlock(entryState?: EntryState): string {
  if (!entryState) return "";

  const lines = [
    entryState.locationId ? `location_id: ${entryState.locationId}` : "",
    entryState.timestamp ? `timestamp: ${entryState.timestamp}` : "",
    `pov_character: ${entryState.povCharacter.name}`,
    entryState.povCharacter.physicalCondition
      ? `physical_condition: ${entryState.povCharacter.physicalCondition}`
      : "",
    entryState.povCharacter.emotionalState
      ? `emotional_state: ${entryState.povCharacter.emotionalState}`
      : "",
    entryState.povCharacter.immediateGoal
      ? `immediate_goal: ${entryState.povCharacter.immediateGoal}`
      : "",
    entryState.povCharacter.activeKnowledge.length > 0
      ? `active_knowledge: ${entryState.povCharacter.activeKnowledge.join(" | ")}`
      : "",
  ].filter(Boolean);

  return lines.length > 0 ? `<entry_state>\n${lines.join("\n")}\n</entry_state>` : "";
}

registerPrompt(writerPromptV2);
