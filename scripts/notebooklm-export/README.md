# Export `docs/graph` cho NotebookLM

Dùng [`llama-index-readers-obsidian`](https://pypi.org/project/llama-index-readers-obsidian/) để đọc vault Obsidian, gộp các chunk theo header của từng file `.md`, rồi xuất Markdown gộp theo **thư mục cấp một** (mỗi file ≈ một nguồn trong NotebookLM, dưới giới hạn ~50 nguồn).

## Chạy

```bash
cd /path/to/novel-writer
python3 -m venv .venv-notebooklm
. .venv-notebooklm/bin/activate
pip install -r scripts/notebooklm-export/requirements.txt
python3 scripts/notebooklm-export/export_graph_for_notebooklm.py
```

Tùy chọn:

- `--vault /đường/dẫn/vault` — mặc định `docs/graph`
- `--out /đường/dẫn/thư_mục` — mặc định `exports/notebooklm-graph`
- `--single` — một file `notebooklm-graph__full.md` thay vì gộp theo thư mục

## Đưa vào NotebookLM (Google)

NotebookLM nhận PDF, Google Docs, văn bản dán, v.v. Markdown tải trực tiếp có thể không được liệt kê; cách an toàn:

1. **Google Drive:** tải các file `.md` lên Drive → mở bằng Google Docs → thêm từ Drive vào NotebookLM (hoặc xuất PDF từ Docs).
2. **PDF:** `pandoc exports/notebooklm-graph/notebooklm-graph__domain.md -o domain.pdf` rồi upload PDF.

`manifest.txt` trong thư mục output có ước lượng số từ từng file (giới hạn thực tế ~500k từ/nguồn).

## Ghi chú

- Reader **bỏ qua** thư mục ẩn (ví dụ `.obsidian`).
- Note rỗng không tạo chunk (MarkdownReader trả về rỗng).
