#!/usr/bin/env python3
"""
Load the Obsidian vault at docs/graph via llama-index-readers-obsidian, merge
per-note chunks, then emit NotebookLM-friendly markdown (merged by top-level
folder, or optionally a single file).

NotebookLM (Google): ~50 sources per notebook, ~500k words per source — this
repo graph is far smaller; default grouping stays well under limits.
"""

from __future__ import annotations

import argparse
import re
from collections import defaultdict
from pathlib import Path

from llama_index.readers.obsidian import ObsidianReader


def word_count(text: str) -> int:
    return len(text.split())


def top_level_folder(folder_name: str) -> str:
    name = (folder_name or "").strip()
    if not name or name == ".":
        return "_root"
    return name.split("/")[0]


def slug_top(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9_-]+", "-", name.strip()).strip("-").lower()
    return s or "section"


def merge_documents_by_file(docs: list) -> list[tuple[str, str, str]]:
    """
    Returns sorted list of (relative_folder, file_name, full_text).
    relative_folder uses POSIX-style path under vault (e.g. database/tables).
    """
    by_key: dict[tuple[str, str], list[str]] = defaultdict(list)
    folder_for_key: dict[tuple[str, str], str] = {}

    for d in docs:
        folder_path = Path(d.metadata["folder_path"])
        file_name = d.metadata["file_name"]
        folder_name = (d.metadata.get("folder_name") or "").replace("\\", "/")
        key = (str(folder_path), file_name)
        by_key[key].append(d.text)
        folder_for_key[key] = folder_name

    rows: list[tuple[str, str, str]] = []
    for folder_path_str, file_name in sorted(by_key.keys()):
        parts = by_key[(folder_path_str, file_name)]
        body = "\n\n".join(parts)
        rel_folder = folder_for_key.get((folder_path_str, file_name), "")
        rows.append((rel_folder, file_name, body))
    return rows


def build_note_markdown(rel_folder: str, file_name: str, body: str) -> str:
    note_title = Path(file_name).stem
    rel = f"{rel_folder}/{file_name}" if rel_folder else file_name
    header = f"## {note_title}\n\n`{rel}`\n\n"
    return header + body.strip() + "\n\n---\n\n"


def emit_grouped(out_dir: Path, rows: list[tuple[str, str, str]]) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    grouped: dict[str, list[str]] = defaultdict(list)
    for rel_folder, file_name, body in rows:
        top = top_level_folder(rel_folder)
        grouped[top].append(build_note_markdown(rel_folder, file_name, body))

    manifest: list[str] = []
    for top in sorted(grouped.keys()):
        chunk = "".join(grouped[top]).strip() + "\n"
        title = f"# Novel graph — {top}\n\n"
        full = title + chunk
        fname = f"notebooklm-graph__{slug_top(top)}.md"
        path = out_dir / fname
        path.write_text(full, encoding="utf-8")
        manifest.append(f"{fname}\twords={word_count(full)}\tchars={len(full)}")
    (out_dir / "manifest.txt").write_text("\n".join(manifest) + "\n", encoding="utf-8")


def emit_single(out_dir: Path, rows: list[tuple[str, str, str]]) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    parts = [build_note_markdown(rel, fn, body) for rel, fn, body in rows]
    full = "# Novel graph — full vault export\n\n" + "".join(parts).strip() + "\n"
    path = out_dir / "notebooklm-graph__full.md"
    path.write_text(full, encoding="utf-8")
    (out_dir / "manifest-full.txt").write_text(
        f"notebooklm-graph__full.md\twords={word_count(full)}\tchars={len(full)}\n",
        encoding="utf-8",
    )


def main() -> None:
    repo = Path(__file__).resolve().parents[2]
    default_vault = repo / "docs" / "graph"

    ap = argparse.ArgumentParser(description="Export Obsidian graph vault for NotebookLM upload.")
    ap.add_argument("--vault", type=Path, default=default_vault, help="Path to Obsidian vault root")
    ap.add_argument(
        "--out",
        type=Path,
        default=repo / "exports" / "notebooklm-graph",
        help="Output directory for .md files",
    )
    ap.add_argument(
        "--single",
        action="store_true",
        help="Emit one merged file instead of one per top-level folder",
    )
    args = ap.parse_args()

    vault: Path = args.vault.resolve()
    if not vault.is_dir():
        raise SystemExit(f"Vault not found: {vault}")

    reader = ObsidianReader(input_dir=str(vault), extract_tasks=False)
    docs = reader.load_data()
    rows = merge_documents_by_file(docs)

    out_dir: Path = args.out.resolve()
    if args.single:
        emit_single(out_dir, rows)
    else:
        emit_grouped(out_dir, rows)

    print(f"Wrote export under: {out_dir}")
    print(f"Notes merged from {len(rows)} files; {len(docs)} reader chunks.")


if __name__ == "__main__":
    main()
