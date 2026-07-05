import { MODEL_CONFIG } from "@novel/core";
import type { LLMProvider, CompletionResponse } from "../../providers/types.ts";
import { withCompletionRetryRaw } from "../../parse-completion-json.ts";
import type { PendingVerificationItem, Severity } from "./types.ts";

export interface VerifierDeps {
  provider: LLMProvider;
  model?: string;
  logger?: {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
  };
}

export interface VerificationResult {
  /** Items confirmed as real issues by the LLM */
  confirmed: { checkId: string; severity: Severity; issue: string }[];
  /** Items dismissed as false positives */
  dismissed: { checkId: string; issue: string; reason: string }[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
  };
}

const SYSTEM_PROMPT = `Bạn là trợ lý kiểm tra tiểu thuyết tiên hiệp/fantasy Việt Nam.

Nhiệm vụ: Xác nhận hoặc bác bỏ các cảnh báo từ hệ thống kiểm tra tự động. Hệ thống regex đã phát hiện các vấn đề tiềm năng, nhưng có thể là false positive do hạn chế của regex với tiếng Việt.

Quy tắc phán đoán:
- unknown_character: CHỈ xác nhận nếu đó thực sự là tên nhân vật MỚI chưa từng xuất hiện, KHÔNG phải:
  + Từ nối/liên từ viết hoa đầu câu ghép với tên (vd: "Nhưng Lâm Phong" = "Nhưng" + "Lâm Phong")
  + Biệt danh/cách gọi khác của nhân vật đã biết (vd: "Lâm Nhị Thúc" = chú hai họ Lâm)
  + Tên kỹ thuật, chiêu thức, vật phẩm bị nhầm thành tên người
- unknown_location: CHỈ xác nhận nếu đó thực sự là địa danh MỚI, KHÔNG phải:
  + Tên cảnh giới tu luyện (Luyện Thể, Tụ Khí, Trúc Cơ, Kim Đan, v.v.)
  + Tên kỹ thuật/chiêu thức
  + Cụm từ thông thường bị regex bắt nhầm
- realm_jump: CHỈ xác nhận nếu trong đoạn văn THỰC SỰ mô tả một sự kiện đột phá đang xảy ra, KHÔNG phải:
  + Hồi tưởng/kể lại đột phá trong quá khứ
  + Thảo luận/giải thích về cơ chế đột phá
  + Đề cập đến đột phá của người khác trong quá khứ
  + Suy nghĩ/dự định/giả định về đột phá

Trả lời bằng JSON.`;

function buildUserPrompt(items: PendingVerificationItem[]): string {
  let prompt =
    "Kiểm tra các cảnh báo sau. Với mỗi cảnh báo, cho biết CONFIRM (xác nhận là lỗi thật) hay DISMISS (false positive).\n\n";

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    prompt += `### Cảnh báo ${i + 1} [${item.checkId}]\n`;
    prompt += `Nội dung: ${item.issue}\n`;
    prompt += `Ngữ cảnh: «${item.snippet}»\n\n`;
  }

  prompt += `Trả lời JSON array, mỗi phần tử: {"index": <số>, "verdict": "confirm"|"dismiss", "reason": "<lý do ngắn>"}`;
  return prompt;
}

const RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    verdicts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer" },
          verdict: { type: "string", enum: ["confirm", "dismiss"] },
          reason: { type: "string" },
        },
        required: ["index", "verdict", "reason"],
      },
    },
  },
  required: ["verdicts"],
};

export async function verifyDeterministicFindings(
  deps: VerifierDeps,
  items: PendingVerificationItem[],
): Promise<VerificationResult> {
  if (items.length === 0) {
    return {
      confirmed: [],
      dismissed: [],
      usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 },
    };
  }

  const groups = groupVerificationItems(items);
  const uniqueItems = groups.map((group) => group.item);
  const model = deps.model ?? MODEL_CONFIG.routes.deterministic_verifier;
  const userPrompt = buildUserPrompt(uniqueItems);

  deps.logger?.info(
    { itemCount: uniqueItems.length, originalItemCount: items.length },
    "verifying deterministic findings with LLM",
  );

  let res: CompletionResponse;
  try {
    res = await withCompletionRetryRaw(
      "deterministic_verifier",
      () =>
        deps.provider.complete({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
          maxOutputTokens: 1024,
          responseSchema: RESPONSE_SCHEMA,
          metadata: {
            agentRole: "deterministic_verifier",
            promptVersion: "v1",
          },
        }),
      2,
    );
  } catch (err) {
    // On LLM failure, only confirm high/critical items (pipeline-blocking).
    // Dismiss medium/low to avoid false positives blocking generation.
    deps.logger?.warn(
      { err },
      "LLM verification failed, confirming only high/critical candidates",
    );
    const confirmed = items
      .filter((it) => it.severity === "critical" || it.severity === "high")
      .map((it) => ({
        checkId: it.checkId,
        severity: it.severity,
        issue: it.issue,
      }));
    const dismissed = items
      .filter((it) => it.severity !== "critical" && it.severity !== "high")
      .map((it) => ({
        checkId: it.checkId,
        issue: it.issue,
        reason: "LLM unavailable — dismissed by fallback policy",
      }));
    return {
      confirmed,
      dismissed,
      usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 },
    };
  }

  const confirmed: VerificationResult["confirmed"] = [];
  const dismissed: VerificationResult["dismissed"] = [];

  try {
    const parsed = JSON.parse(res.content);
    const verdicts: { index: number; verdict: string; reason: string }[] =
      parsed.verdicts ?? parsed;
    const addressedGroups = new Set<number>();

    for (const v of verdicts) {
      const groupIndex = v.index - 1; // 1-based index from prompt
      const group = groups[groupIndex];
      if (!group) continue;
      addressedGroups.add(groupIndex);

      if (v.verdict === "confirm") {
        for (const item of group.items) {
          confirmed.push({
            checkId: item.checkId,
            severity: item.severity,
            issue: item.issue,
          });
        }
      } else {
        for (const item of group.items) {
          dismissed.push({
            checkId: item.checkId,
            issue: item.issue,
            reason: v.reason ?? "",
          });
        }
      }
    }

    // Any items not addressed by LLM → conservatively confirm
    for (let i = 0; i < groups.length; i++) {
      if (!addressedGroups.has(i)) {
        for (const item of groups[i]!.items) {
          confirmed.push({
            checkId: item.checkId,
            severity: item.severity,
            issue: item.issue,
          });
        }
      }
    }
  } catch {
    // Parse failure → confirm all conservatively
    return {
      confirmed: items.map((it) => ({
        checkId: it.checkId,
        severity: it.severity,
        issue: it.issue,
      })),
      dismissed: [],
      usage: res.usage,
    };
  }

  deps.logger?.info(
    { confirmed: confirmed.length, dismissed: dismissed.length },
    "LLM verification complete",
  );

  return { confirmed, dismissed, usage: res.usage };
}

function groupVerificationItems(items: PendingVerificationItem[]): Array<{
  item: PendingVerificationItem;
  items: PendingVerificationItem[];
}> {
  const groups: Array<{
    item: PendingVerificationItem;
    items: PendingVerificationItem[];
  }> = [];
  const byKey = new Map<string, number>();

  for (const item of items) {
    const key = [
      item.checkId,
      item.severity,
      normalizeVerificationKey(item.issue),
      normalizeVerificationKey(item.snippet),
    ].join("|");
    const groupIndex = byKey.get(key);
    if (groupIndex === undefined) {
      byKey.set(key, groups.length);
      groups.push({ item, items: [item] });
    } else {
      groups[groupIndex]!.items.push(item);
    }
  }

  return groups;
}

function normalizeVerificationKey(value: string): string {
  return value.trim().toLocaleLowerCase("vi-VN").replace(/\s+/g, " ");
}
