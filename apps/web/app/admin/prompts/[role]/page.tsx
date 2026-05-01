"use client";

import { useEffect, useState, use } from "react";
import { diffLines } from "diff";
import {
  getPromptVersionsByRole,
  type PromptVersionFull,
} from "@/lib/api/prompt-versions";

export default function PromptDiffPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = use(params);
  const [rows, setRows] = useState<PromptVersionFull[]>([]);
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");

  useEffect(() => {
    getPromptVersionsByRole(role).then((r) => {
      setRows(r);
      if (r.length >= 2) {
        setA(r[r.length - 2].id);
        setB(r[r.length - 1].id);
      } else if (r.length === 1) {
        setA(r[0].id);
        setB(r[0].id);
      }
    });
  }, [role]);

  const va = rows.find((r) => r.id === a);
  const vb = rows.find((r) => r.id === b);
  const parts = va && vb ? diffLines(va.template, vb.template) : [];

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">{role} — prompt diff</h1>
      <div style={{ display: "flex", gap: 16, margin: "12px 0" }}>
        <label>
          From:{" "}
          <select value={a} onChange={(e) => setA(e.target.value)}>
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.version}
              </option>
            ))}
          </select>
        </label>
        <label>
          To:{" "}
          <select value={b} onChange={(e) => setB(e.target.value)}>
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.version}
              </option>
            ))}
          </select>
        </label>
      </div>
      <pre
        style={{
          border: "1px solid #ccc",
          padding: 12,
          whiteSpace: "pre-wrap",
          fontFamily: "monospace",
          fontSize: 13,
          wordBreak: "break-word",
        }}
      >
        {parts.map((p, i) => (
          <span
            key={i}
            style={{
              backgroundColor: p.added
                ? "#dcfce7"
                : p.removed
                  ? "#fee2e2"
                  : "transparent",
            }}
          >
            {(p.added ? "+ " : p.removed ? "- " : "  ") + p.value}
          </span>
        ))}
      </pre>
    </div>
  );
}
