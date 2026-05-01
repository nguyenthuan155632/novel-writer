"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

const POWER_KINDS = [
  "cultivation",
  "martial",
  "ability",
  "tech",
  "urban",
  "historical",
  "horror",
  "mystery",
  "system",
  "reincarnation",
  "mixed",
  "none",
] as const;

const POWER_KIND_LABELS: Record<(typeof POWER_KINDS)[number], string> = {
  cultivation: "Tu luyện",
  martial: "Võ đạo",
  ability: "Năng lực",
  tech: "Công nghệ",
  urban: "Đô thị",
  historical: "Lịch sử",
  horror: "Kinh dị",
  mystery: "Bí ẩn",
  system: "Hệ thống",
  reincarnation: "Chuyển sinh",
  mixed: "Kết hợp",
  none: "Không có",
};

interface Bible {
  worldRules: string;
  powerSystem: string | null;
  powerSystemKind: string | null;
  cultivationSystem: string | null;
  bloodlineSystem: string | null;
  styleGuide: string;
  forbiddenRules: string;
  endingDirection: string | null;
  compactSummary: string | null;
}

type TabId = "world" | "systems" | "style" | "summary";

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const tabs: Tab[] = [
  { id: "world", label: "World", icon: "🌍" },
  { id: "systems", label: "Systems", icon: "⚔️" },
  { id: "style", label: "Style", icon: "✍️" },
  { id: "summary", label: "Summary", icon: "📝" },
];

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

function countChars(text: string): number {
  return text.length;
}

export function EditForm({
  storyId,
  bible,
}: {
  storyId: string;
  bible: Bible;
}) {
  const [data, setData] = useState({
    worldRules: bible.worldRules,
    cultivationSystem: bible.cultivationSystem ?? "",
    bloodlineSystem: bible.bloodlineSystem ?? "",
    styleGuide: bible.styleGuide,
    forbiddenRules: bible.forbiddenRules,
    endingDirection: bible.endingDirection ?? "",
    compactSummary: bible.compactSummary ?? "",
  });
  const [powerSystem, setPowerSystem] = useState(bible.powerSystem ?? "");
  const [powerSystemKind, setPowerSystemKind] = useState<
    (typeof POWER_KINDS)[number]
  >((bible.powerSystemKind as (typeof POWER_KINDS)[number]) ?? "cultivation");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("world");
  const router = useRouter();

  function bind<K extends keyof typeof data>(k: K) {
    return {
      value: data[k],
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        setData({ ...data, [k]: e.target.value }),
    };
  }

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      await apiFetch(`/api/stories/${storyId}/bible`, {
        method: "PUT",
        body: JSON.stringify({ ...data, powerSystem, powerSystemKind }),
      });
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function renderTextareaWithCount(
    key: keyof typeof data,
    label: string,
    rows: number,
    placeholder: string,
    wordLimit?: number,
  ) {
    const value = data[key];
    const words = countWords(value);
    const chars = countChars(value);
    const isWarning = !!wordLimit && words > wordLimit;

    return (
      <div className="textarea-group" style={{ marginTop: "15px" }}>
        <label>{label}</label>
        <textarea rows={rows} {...bind(key)} placeholder={placeholder} />
        <div className={`textarea-count ${isWarning ? "warning" : ""}`}>
          <span>{wordLimit ? `${chars} characters` : `${words} words`}</span>
          <span>
            {wordLimit
              ? `${words} / ${wordLimit} words`
              : `${chars} characters`}
          </span>
        </div>
      </div>
    );
  }

  function renderTabContent() {
    switch (activeTab) {
      case "world":
        return (
          <div className="tab-panel active">
            {renderTextareaWithCount(
              "worldRules",
              "World Rules",
              8,
              "Describe the world rules, setting, and environment...",
            )}
          </div>
        );

      case "systems":
        return (
          <div className="tab-panel active">
            <div className="field-group">
              <label>Loại hệ thống sức mạnh</label>
              <select
                value={powerSystemKind}
                onChange={(e) =>
                  setPowerSystemKind(
                    e.target.value as (typeof POWER_KINDS)[number],
                  )
                }
              >
                {POWER_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {POWER_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group" style={{ marginTop: "15px" }}>
              <label>Power System</label>
              <textarea
                value={powerSystem}
                onChange={(e) => setPowerSystem(e.target.value)}
                rows={6}
              />
            </div>

            {powerSystemKind === "cultivation" && (
              <>
                {renderTextareaWithCount(
                  "cultivationSystem",
                  "Cultivation System",
                  6,
                  "Describe the cultivation system...",
                )}
                {renderTextareaWithCount(
                  "bloodlineSystem",
                  "Bloodline System",
                  6,
                  "Describe the bloodline system...",
                )}
              </>
            )}
          </div>
        );

      case "style":
        return (
          <div className="tab-panel active">
            {renderTextareaWithCount(
              "styleGuide",
              "Style Guide",
              6,
              "Describe the writing style guide...",
            )}
            {renderTextareaWithCount(
              "forbiddenRules",
              "Forbidden Rules",
              6,
              "List forbidden rules and elements...",
            )}
          </div>
        );

      case "summary":
        return (
          <div className="tab-panel active">
            {renderTextareaWithCount(
              "endingDirection",
              "Ending Direction",
              4,
              "Describe the planned ending direction...",
            )}
            {renderTextareaWithCount(
              "compactSummary",
              "Compact Summary",
              8,
              "Write a compact summary for HOT cache...",
            )}
          </div>
        );
    }
  }

  return (
    <div className="studio-panel">
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">{renderTabContent()}</div>

      {err && <p className="error">{err}</p>}
      <div className="button-row">
        <button className="primary" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save (creates new version)"}
        </button>
      </div>
    </div>
  );
}
