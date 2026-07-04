# Hướng dẫn sử dụng và giải thích hệ thống Novel Factory

> Tài liệu này giải thích toàn bộ hệ thống tự động sinh truyện dài kỳ bằng AI/LLM. Đọc từ đầu đến cuối để hiểu flow, hoặc tra cứu từng phần khi cần debug.

---

## Mục lục

- [A. Tổng quan hệ thống](#a-tổng-quan-hệ-thống)
- [B. Giải thích chi tiết các khái niệm nghiệp vụ](#b-giải-thích-chi-tiết-các-khái-niệm-nghiệp-vụ)
  - [1. Story Bible](#1-story-bible)
  - [2. Saga](#2-saga)
  - [3. Arc](#3-arc)
  - [4. Canon](#4-canon)
  - [5. Pending Canon Updates](#5-pending-canon-updates)
  - [6. Timeline](#6-timeline)
  - [7. Seed / Planted Seed](#7-seed--planted-seed)
  - [8. Costs / LLM Costs](#8-costs--llm-costs)
  - [9. Context Packet / Chapter Packet](#9-context-packet--chapter-packet)
  - [10. Chapter Summary](#10-chapter-summary)
  - [11. Characters / Factions / Bloodlines / Settings](#11-characters--factions--bloodlines--settings)
- [C. Giải thích database](#c-giải-thích-database)
- [D. Flow sinh chương truyện](#d-flow-sinh-chương-truyện)
- [E. Jobs và worker](#e-jobs-và-worker)
- [F. Validations](#f-validations)
- [G. LLM Providers và Prompt System](#g-llm-providers-và-prompt-system)
- [H. Trạng thái lỗi và cách xử lý](#h-trạng-thái-lỗi-và-cách-xử-lý)
- [I. Hướng dẫn vận hành thực tế](#i-hướng-dẫn-vận-hành-thực-tế)
- [J. Đề xuất cải thiện hệ thống](#j-đề-xuất-cải-thiện-hệ-thống)

---

## A. Tổng quan hệ thống

### Hệ thống này dùng để làm gì?

**Novel Factory** là hệ thống tự động sinh truyện dài kỳ (500–1000 chương) bằng AI/LLM. Thay vì một prompt duy nhất viết cả quyển truyện, hệ thống chia nhỏ quá trình thành nhiều giai đoạn:

1. **Lập kế hoạch** (Planning): Từ 1 dòng premise, AI lập Bible → Saga → Arc → Chapter Packet.
2. **Viết** (Writing): Từng chương được viết dựa trên packet + ngữ cảnh đầy đủ.
3. **Kiểm tra** (Verification): Kiểm tra canon, logic, nhân vật, văn phong.
4. **Ghi nhớ** (Memory): Tóm tắt chương, cập nhật canon, timeline, seeds.

### Vai trò của AI/LLM

Hệ thống sử dụng **11 agent LLM chuyên biệt**, mỗi agent làm một nhiệm vụ:

| Agent                 | Vai trò               | Input                   | Output                   |
| --------------------- | --------------------- | ----------------------- | ------------------------ |
| Bible Generator       | Xây dựng thế giới     | Premise 1 dòng          | Story Bible              |
| Saga Planner          | Chiến lược dài hạn    | Bible + Premise         | Multi-saga roadmap       |
| Arc Planner           | Beats trung hạn       | Current Saga + Bible    | Danh sách Arcs           |
| Packet Generator      | Blueprint từng chương | Arc Summary + Context   | ChapterPacket            |
| Writer                | Viết truyện           | ChapterPacket + Context | Chapter 2000–3000 từ     |
| LLM Validator         | Kiểm tra chất lượng   | Chapter + Style Guide   | Đánh giá voice/logic     |
| Auto-Fixer            | Sửa lỗi nhỏ           | Chapter + Issues        | Chapter đã patch         |
| High-Stakes Reviewer  | Đánh giá nghiêm ngặt  | Full Arc / Major Events | Deep critique            |
| Canon Extractor       | Trích xuất canon      | Generated Chapter       | Pending canon updates    |
| Summary Compactor     | Tóm tắt chương        | Chapter Content         | Short + Detailed summary |
| Arc Summary Compactor | Tóm tắt phân cấp      | Past Chapter Summaries  | Rolling arc/saga summary |

### Vì sao cần quản lý memory, canon, timeline?

Khi viết truyện dài 1000 chương, LLM không thể nhớ hết toàn bộ nội dung đã viết (context window có hạn). Hệ thống giải quyết bài toán này bằng:

- **Chapter Summary**: Tóm tắt mỗi chương thành 200–500 tokens, dùng cho chương sau.
- **Arc/Saga Summary**: Tóm tắt cấp cao hơn, giữ nhịp cốt truyện.
- **Canon Facts**: Các sự kiện đã xác nhận (nhân vật chết, cảnh giới, mối quan hệ) được lưu riêng và retrieve qua embedding.
- **Timeline**: Trật tự thứ gian các sự kiện.
- **Seeds**: Cài cắm tình tiết cho chương sau "payoff".

### Luồng tổng thể (text flow)

```text
[Tạo story]
    ↓
[POST /api/stories/:id/bible] → Bible Generator (sync LLM)
    ↓
[POST /api/stories/:id/sagas/plan] → Saga Planner (sync LLM)
    ↓
[POST /api/stories/:id/sagas/:sagaId/arcs/plan] → Arc Planner (sync LLM)
    ↓
[POST /api/stories/:id/chapters/generate] → Enqueue job 'generate-chapter'
    ↓
[Worker: generate-chapter job]
    → Resolve arc + upsert chapter row (status='generating')
    → Load bible, characters, threads, seeds, summaries
    → Packet Generator LLM → ChapterPacket
    → Packet Auditor kiểm tra packet
    → Build Context (Hot/Warm/Cold tiers + embedding retrieval)
    → Persist ContextPacket
    → Writer LLM → Chapter content + title
    → Deterministic Validator (12 checks)
    → LLM Validator (soft quality check)
    → Auto-Fixer (nếu low/medium issues)
    → Canon Extractor LLM → Canon updates
    → Canon Merger (auto hoặc review mode)
    → Summary Compactor LLM → Short + Detailed summary
    → Embed summary (OpenRouter embedding)
    → Update chapter row
    → Enqueue refresh-arc-summary
    → Enqueue high-stakes-review (nếu chapter cuối arc)
    ↓
[Status = 'completed' | 'paused_pending_updates' | 'failed']
```

---

## B. Giải thích chi tiết các khái niệm nghiệp vụ

### Glossary nhanh (1 dòng/khái niệm)

| Khái niệm           | Tóm tắt 1 dòng                                                                           | Bảng DB                 |
| ------------------- | ---------------------------------------------------------------------------------------- | ----------------------- |
| **Story**           | Đơn vị gốc — 1 quyển truyện, có premise, genre, target chapter count                     | `stories`               |
| **Bible**           | Bách khoa thế giới: world rules, hệ thống tu luyện, style guide — _kế hoạch tĩnh_        | `story_bibles`          |
| **Saga**            | Tầng cốt truyện dài nhất (200–500 chương/saga) — _kế hoạch dài hạn_                      | `sagas`                 |
| **Arc**             | Tầng cốt truyện trung (20–50 chương/arc) — _kế hoạch trung hạn_                          | `arcs`                  |
| **Chapter**         | 1 chương truyện viết ra (1500–4000 từ)                                                   | `chapters`              |
| **Chapter Packet**  | Blueprint chi tiết của 1 chương (goal, events, conflict, cliffhanger) — _trước khi viết_ | `chapter_packets`       |
| **Context Packet**  | Ngữ cảnh đầy đủ đưa vào Writer LLM, 3 tầng Hot/Warm/Cold                                 | `context_packets`       |
| **Canon Fact**      | Một sự thật đã xác nhận về thế giới — _động, growable, vector-searchable_                | `canon_facts`           |
| **Pending Update**  | Hàng đợi thay đổi canon chờ human review hoặc resolve conflict                           | `pending_canon_updates` |
| **Timeline Event**  | Sự kiện theo trình tự thời gian (chương N: "X xảy ra")                                   | `timeline_events`       |
| **Seed (Planted)**  | Tình tiết cài cắm sớm để payoff sau (foreshadowing có deadline)                          | `planted_seeds`         |
| **Open Thread**     | Plot thread đang mở, chưa resolve (ví dụ "ai giết sư phụ")                               | `open_threads`          |
| **Character**       | Nhân vật + trạng thái hiện tại (cảnh giới, sống/chết, lần xuất hiện cuối)                | `characters`            |
| **Faction**         | Thế lực/tông môn/gia tộc                                                                 | `factions`              |
| **Bloodline**       | Huyết mạch đặc biệt (xianxia/fantasy genre)                                              | `bloodlines`            |
| **Chapter Summary** | Tóm tắt sau viết, 2 độ chi tiết, có embedding để RAG                                     | `chapter_summaries`     |
| **Validation**      | Kết quả kiểm tra chất lượng (deterministic + LLM)                                        | `validations`           |
| **LLM Call**        | Audit log mỗi lần gọi LLM (token, cost, agent role)                                      | `llm_calls`             |
| **Story Settings**  | Override config per-story (model routes, token budget, generation params)                | `story_settings`        |

### Mental model chung

Có 3 trục cần phân biệt rõ — bạn nhầm lẫn ở đây thì sẽ debug sai chỗ:

```
                   TĨNH (planning)         ←→         ĐỘNG (facts đã xảy ra)
                   ─────────────────                  ──────────────────────
    DÀI HẠN        Bible, Saga                        Canon Facts (importance=critical/locked)
    TRUNG HẠN      Arc                                Open Threads, Planted Seeds (status=planted)
    NGẮN HẠN       Chapter Packet                     Timeline Events, Chapter Summary

                   PRE-WRITE                           POST-WRITE
                   (tạo trước khi viết chapter)        (trích xuất sau khi viết)
```

- **Tĩnh = kế hoạch**, do người/Planner agents tạo, cập nhật khi mở rộng thế giới.
- **Động = thực tế**, do Canon Extractor trích xuất từ chapter content, có conflict detection.
- Khi truyện và kế hoạch lệch nhau → bạn phải quyết định: sửa Bible (kế hoạch sai) hay regenerate chapter (truyện sai).

---

### 1. Story Bible

#### 1.1 Khái niệm

Bible là **bách khoa toàn thư của thế giới truyện** — tài liệu _tĩnh_ mô tả luật chơi của vũ trụ. Khác với canon (sự kiện đã xảy ra), Bible mô tả **những gì có thể xảy ra** và **cách thế giới vận hành**.

Analogy: Nếu truyện là một ván cờ, Bible là _luật cờ vua_ (tĩnh), Canon là _biên bản các nước đã đi_ (động).

#### 1.2 Vì sao cần Bible?

Không có Bible thì:

- Mỗi chương Writer LLM tự bịa cảnh giới mới → tu luyện hỗn loạn (chương 5 đột phá Kim Đan, chương 6 quay về Trúc Cơ).
- Không có style guide → văn phong trôi từ tiên hiệp sang isekai sang LitRPG.
- Forbidden rules không tồn tại → AI viết content vi phạm (sex/gore khi không muốn).
- Validator `realm_jump` không có baseline để đối chiếu → false negative.

#### 1.3 Cấu trúc dữ liệu

| Trường               | Kiểu       | Vai trò                                                         |
| -------------------- | ---------- | --------------------------------------------------------------- |
| `id`                 | uuid       | PK                                                              |
| `story_id`           | uuid (FK)  | 1 story → N versions                                            |
| `version`            | int        | Bible version (1, 2, 3...) — tăng khi update                    |
| `world_rules`        | text/jsonb | Luật vật lý/ma pháp/social của thế giới                         |
| `cultivation_system` | jsonb      | Danh sách cảnh giới có thứ tự, breakthrough requirements        |
| `bloodline_system`   | jsonb      | Hệ thống huyết mạch (rank, source, traits)                      |
| `style_guide`        | text       | Quy tắc văn phong (tone, POV, vocabulary)                       |
| `forbidden_rules`    | jsonb      | Mảng các điều cấm — Writer không được vi phạm                   |
| `ending_direction`   | text       | Hướng kết thúc dự kiến (giúp Saga Planner)                      |
| `compact_summary`    | text       | Phiên bản nén (~500 tokens) — **field thực sự đi vào Hot Tier** |
| `style_few_shots`    | jsonb      | Mảng đoạn văn mẫu để Writer học tone                            |

#### 1.4 Ví dụ thật (rút gọn)

```json
{
  "version": 2,
  "world_rules": "Thế giới Cửu Châu, lục địa rộng lớn, ma khí từ Cửu U xâm thực. Không có súng/máy móc.",
  "cultivation_system": {
    "realms": [
      "Phàm Nhân",
      "Luyện Khí",
      "Trúc Cơ",
      "Kim Đan",
      "Nguyên Anh",
      "Hóa Thần",
      "Hợp Thể",
      "Đại Thừa",
      "Tiên Nhân"
    ],
    "breakthrough_requirement": "Phải có thiên kiếp + nội đan đủ cô đặc",
    "max_realms_per_chapter": 1
  },
  "style_guide": "POV ngôi 3 hạn chế. Tránh từ 'hệ thống', 'level up', 'XP'. Dùng từ Hán-Việt cổ phong.",
  "forbidden_rules": [
    "Không có nội dung sex tường thuật chi tiết",
    "Không revival nhân vật đã xác nhận chết",
    "Không có công nghệ hiện đại"
  ],
  "compact_summary": "Cửu Châu xianxia, 9 cảnh giới, MC từ phế vật → tiên đế. Tông môn chính: Thiên Vân, Huyết Sát, Vô Cực.",
  "style_few_shots": [
    "Lâm Vân khẽ nhắm mắt, linh khí trong kinh mạch chầm chậm xoay chuyển như sông Trường Giang cuộn trôi..."
  ]
}
```

#### 1.5 Lifecycle

```
[POST /api/stories/:id/bible]
   ↓
Bible Generator LLM (sync)
   ↓
Insert row với version=1
   ↓
[Generate chapters dùng version mới nhất]
   ↓
[Cần mở rộng — vd: thêm tông môn] → PUT /api/stories/:id/bible
   ↓
Insert row mới với version=2 (KHÔNG update row cũ — versioned)
```

Lưu ý: Hệ thống dùng version mới nhất khi build context. Bible cũ giữ lại để audit/reproduce.

#### 1.6 Ai đọc, ai ghi?

- **Ghi**: Bible Generator (lần đầu), human qua API (cập nhật).
- **Đọc**:
  - Saga Planner (lập saga roadmap)
  - Arc Planner (lập arcs)
  - Packet Generator (sinh chapter packet)
  - Writer (qua Hot Tier — `systemRules`, `powerRules`, `styleGuide`)
  - Deterministic validators (`realm_jump`, `forbidden_move`, `style_red_flags`)
  - Canon Extractor (so sánh expected vs actual)

#### 1.7 Anti-pattern / Lỗi thường gặp

| Triệu chứng                                     | Nguyên nhân gốc                                              | Fix                                            |
| ----------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| Validator `realm_jump` không bắt được đột phá   | `cultivation_system.realms` rỗng hoặc tên không khớp content | Cập nhật Bible với realm names khớp tiếng Việt |
| Writer drift sang văn phong web novel           | `style_few_shots` rỗng                                       | Lấy 2-3 đoạn văn xuôi tốt nhất, gắn vào Bible  |
| Chapter có content vi phạm                      | `forbidden_rules` thiếu hoặc chung chung                     | Thêm rule cụ thể, kèm ví dụ                    |
| `compact_summary` chiếm quá nhiều token         | Generator sinh quá dài                                       | Cắt thủ công xuống <500 tokens                 |
| Bible v2 đã update nhưng chương mới vẫn dùng v1 | Worker dùng snapshot từ enqueue time                         | Re-enqueue chapter sau khi update Bible        |

#### 1.8 Cách debug

```sql
-- Xem Bible version hiện tại
SELECT version, length(compact_summary) AS summary_len, created_at
FROM story_bibles WHERE story_id = '...' ORDER BY version DESC;

-- Bible nào đã đi vào chapter cụ thể? Xem snapshot
SELECT config_snapshot->'bibleVersion' FROM context_packets WHERE chapter_id = '...';
```

---

### 2. Saga

#### 2.1 Khái niệm

Saga là **tầng kế hoạch dài nhất** trong hierarchy planning. 1 truyện 1000 chương thường có 3–5 sagas, mỗi saga là một "act" lớn của câu chuyện.

```
Truyện 1000 chương
├── Saga 1: Khởi Nguyên (chương 1–200) — MC yếu, học nghệ
├── Saga 2: Tranh Bá (chương 201–500) — xung đột thế lực
├── Saga 3: Phi Thăng (chương 501–800) — vượt giới hạn
└── Saga 4: Chí Tôn (chương 801–1000) — đại kết cục
```

#### 2.2 Vì sao cần Saga (không Arc trực tiếp là đủ?)

Vì context window có hạn. Khi viết chương 600, không thể nhồi 600 arc summary vào prompt. Saga là **tầng nén thông tin cao hơn**: 5 saga summary thay cho 25 arc summary.

Hierarchical compaction:

```
Chapter content (3000 từ)
   ↓ Summary Compactor
Chapter summary (200 tokens)
   ↓ Arc Summary Compactor (gom 20–50 chapter summaries)
Arc rolling_summary (~500 tokens)
   ↓ Saga Summary Compactor (gom các arc summaries trong saga)
Saga rolling_summary (~800 tokens) ← đi vào Warm Tier ở chương xa
```

#### 2.3 Cấu trúc dữ liệu

| Trường                        | Kiểu  | Vai trò                                      |
| ----------------------------- | ----- | -------------------------------------------- |
| `saga_number`                 | int   | Thứ tự (1, 2, 3...)                          |
| `title`                       | text  | "Khởi Nguyên"                                |
| `premise`                     | text  | Tóm tắt chiến lược saga (1-2 đoạn)           |
| `start_chapter`/`end_chapter` | int   | Khoảng chương dự kiến                        |
| `rolling_summary`             | text  | Tóm tắt động — refresh sau mỗi arc kết thúc  |
| `main_themes`                 | jsonb | Mảng theme chính ("báo thù", "trưởng thành") |
| `major_mysteries`             | jsonb | Mảng bí ẩn lớn cần resolve trong saga        |
| `expected_turning_points`     | jsonb | Mảng turning points dự kiến                  |

#### 2.4 Lifecycle

```
[POST /api/stories/:id/sagas/plan]
   ↓
Saga Planner LLM (đọc Bible + premise)
   ↓
Insert N saga rows (5–10 sagas)
   ↓
[Generate chapters trong saga 1]
   ↓
Sau mỗi arc complete → enqueue refresh-saga-summary
   ↓
Saga Summary Compactor cập nhật rolling_summary
   ↓
[Hết chương trong saga 1] → status=completed → chuyển sang saga 2
```

#### 2.5 Anti-pattern

- **Saga quá dài (500+ chương)**: rolling_summary mất chi tiết. Tách thành 2 saga.
- **Sagas quá ngắn (< 100 chương)**: overhead summary refresh không đáng. Gộp thành 1 saga lớn.
- **`major_mysteries` rỗng**: không có hook dài hạn → độc giả mất hứng. Bắt buộc Saga Planner phải sinh ít nhất 2 mysteries/saga.

---

### 3. Arc

#### 3.1 Khái niệm

Arc là **đoạn truyện trung hạn** với mục tiêu cụ thể, thường 20–50 chương, có mở-đỉnh-kết rõ ràng.

```
Arc "Thiên Vân Tông Chiến" (chương 45–80, thuộc Saga "Khởi Nguyên")
- Mục tiêu MC: Báo thù tông môn cũ
- Xung đột chính: Đối đầu trưởng lão Lý Hắc
- Seeds cần resolve: "mật thất chưởng môn", "bảo vật thất lạc"
- Expected character changes: "Lâm Vân đột phá Trúc Cơ"
- Climax dự kiến: chương 75–78
- Cliff/transition vào arc tiếp: chương 80
```

#### 3.2 Cấu trúc dữ liệu

| Trường                        | Kiểu  | Vai trò                                            |
| ----------------------------- | ----- | -------------------------------------------------- |
| `arc_number`                  | int   | Thứ tự trong saga                                  |
| `saga_id`                     | uuid  | FK đến saga                                        |
| `title`, `premise`            | text  | Tên + tóm tắt                                      |
| `start_chapter`/`end_chapter` | int   | Khoảng chương                                      |
| `main_conflict`               | text  | Xung đột trung tâm (Writer dùng để giữ tension)    |
| `expected_changes`            | jsonb | Thay đổi dự kiến (character power, faction status) |
| `seeds_to_resolve_in_arc`     | jsonb | Mảng seed_id phải payoff trong arc                 |
| `rolling_summary`             | text  | Tóm tắt động — refresh sau mỗi chapter             |
| `status`                      | enum  | `planned` / `in_progress` / `completed`            |

#### 3.3 Vai trò trong pipeline generate-chapter

Arc là **cầu nối** giữa kế hoạch dài hạn (Saga/Bible) và blueprint chương cụ thể (ChapterPacket):

```
Bible + Saga.premise + Saga.major_mysteries
   ↓
Arc.main_conflict + Arc.expected_changes (ràng buộc trung hạn)
   ↓
ChapterPacket.goal (cụ thể cho chương N) ← Packet Generator chọn 1 mục tiêu nhỏ phù hợp với arc
```

Arc cung cấp:

- `arcSummary` → **Warm Tier** context cho Writer.
- `planted_seed_ids` → Packet Generator biết seed nào cần được mention/resolve.
- `expected_character_changes` → Canon Extractor verify "có đúng MC đột phá ở arc này không".

#### 3.4 Lifecycle

```
[POST /api/stories/:id/sagas/:sagaId/arcs/plan]
   ↓
Arc Planner LLM (đọc Saga + Bible)
   ↓
Insert N arc rows (status=planned)
   ↓
[Generate chapter đầu tiên của arc] → arc.status=in_progress
   ↓
Sau mỗi chapter → enqueue refresh-arc-summary → cập nhật rolling_summary
   ↓
[Chapter cuối arc] → arc.status=completed → enqueue high-stakes-review
   ↓
[Saga summary refresh nếu là arc cuối saga]
```

#### 3.5 Anti-pattern

| Triệu chứng                                             | Nguyên nhân                                                      |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| Arc kéo dài hơn dự kiến (chương 80 vẫn trong arc 45-80) | `end_chapter` chỉ là dự kiến, không enforce. Cần manual cập nhật |
| Seeds không được payoff đúng arc                        | Packet Auditor đáng ra phải catch — kiểm tra `due_seeds`         |
| `rolling_summary` mất bối cảnh đầu arc                  | Refresh job dùng sliding window 50 — arc dài hơn → drop          |
| Arc summary có info từ arc khác                         | Arc Summary Compactor lấy nhầm chapter range                     |

---

### 4. Canon

#### 4.1 Khái niệm

Canon là **kiến thức đã xác nhận** về thế giới — single source of truth về _trạng thái hiện tại_ của mọi thứ.

3 loại canon chính:

1. **Character state**: cảnh giới hiện tại, sống/chết/mất tích, vũ khí trang bị.
2. **Fact**: "Thiên Vân Tông có 7 đỉnh", "Huyết Ma Công phải có Huyết Ma huyết mạch mới tu được".
3. **Event**: "Chương 50: A giết B tại Tử Vong cốc" (overlap với Timeline).

Canon **khác Bible**:

- Bible: _thế giới này có thể có 9 cảnh giới_.
- Canon: _Lâm Vân hiện đang ở cảnh giới Kim Đan tầng 3_.

Canon **khác Summary**:

- Summary: paraphrase nội dung chương (lossy, đọc cho Writer chương sau).
- Canon: fact rời rạc, exact, có embedding để semantic retrieve.

#### 4.2 Vì sao Canon là core của hệ thống?

Truyện 1000 chương không thể nhồi toàn bộ 1000 chapter content vào prompt. Vấn đề:

- Chương 800 cần biết "Lý Hắc đã chết ở chương 78" → nếu không có canon, Writer có thể vô tình làm Lý Hắc xuất hiện.
- Chương 500 cần biết "thuốc Cửu Chuyển Hồi Hồn cần 9 nguyên liệu" — nếu lúc viết Bible chưa định nghĩa, fact này sinh ra ở chương 200, phải được persist.

Canon giải quyết:

1. **Persistence**: Mọi fact quan trọng được lưu riêng, retrieve qua embedding.
2. **Validation**: Deterministic validator dùng canon để bắt lỗi (`dead_character`, `realm_regression`).
3. **Retrieval**: Khi viết chương N, RAG retrieve top-K facts liên quan theo `packet.goal`.

#### 4.3 Cấu trúc `canon_facts`

| Trường           | Kiểu         | Vai trò                                                       |
| ---------------- | ------------ | ------------------------------------------------------------- |
| `id`             | uuid         | PK                                                            |
| `story_id`       | uuid         | Belongs to story                                              |
| `fact`           | text         | Câu fact, vd: "Lý Hắc đã chết tại chương 78 do Lâm Vân giết"  |
| `source_chapter` | int          | Chương phát sinh fact                                         |
| `importance`     | enum         | `low` / `medium` / `high` / `critical` / `locked`             |
| `locked`         | boolean      | Nếu true → không cho phép update tự động (chỉ human edit)     |
| `embedding`      | vector(1536) | OpenRouter text-embedding-3-small                             |
| `tags`           | jsonb        | Mảng tag để filter (`["character:ly-hac", "death", "arc-2"]`) |

#### 4.4 Importance levels — ý nghĩa thực tế

| Mức        | Ý nghĩa                                        | Ảnh hưởng retrieval                      |
| ---------- | ---------------------------------------------- | ---------------------------------------- |
| `low`      | Detail nhỏ, có thể bỏ qua                      | Ít được retrieve (rank thấp)             |
| `medium`   | Detail bình thường                             | Default                                  |
| `high`     | Quan trọng cho cốt truyện                      | Boost rank trong RAG                     |
| `critical` | Plot-critical (key revelations)                | Luôn ưu tiên retrieve                    |
| `locked`   | Bất khả xâm phạm (vd: identity của final boss) | Luôn retrieve + Conflict Detector strict |

#### 4.5 Lifecycle của một canon fact

```
[Chapter N được viết xong]
   ↓
Canon Extractor LLM đọc chapter content
   ↓
Trả về candidate updates: [{type: 'fact', payload: {...}}, ...]
   ↓
Conflict Detector kiểm tra:
   - Có duplicate fact không? (similarity check qua embedding)
   - Có vi phạm locked field không?
   - Có làm regression (cảnh giới giảm)?
   - Có dead character action?
   ↓
Canon Merger:
   - mode=auto + no conflict → INSERT vào canon_facts
   - mode=auto + conflict → vào pending_canon_updates (conflict_status='conflict')
   - mode=safe → tất cả vào pending (dù không conflict)
   ↓
[Human approve qua API] → INSERT vào canon_facts + UPDATE pending.resolution='approved'
   ↓
[Embedding generate cho fact mới] → vector available
   ↓
[Chương sau: RAG retrieve dựa trên packet.goal embedding] → fact xuất hiện trong Cold Tier
```

#### 4.6 Xung đột canon — 5 loại

| Conflict type           | Phát hiện thế nào                                             | Ví dụ                                      |
| ----------------------- | ------------------------------------------------------------- | ------------------------------------------ |
| `realm_regression`      | New realm rank < current realm rank theo `cultivation_system` | MC đang Kim Đan, fact mới nói MC ở Trúc Cơ |
| `dead_character_action` | Character.status='dead' nhưng có action mới                   | Lý Hắc (chết ch.78) "phun chưởng" ở ch.150 |
| `locked_field`          | Update vào field có `locked_fields` chứa key đó               | Cố đổi MC.bloodline đã locked              |
| `duplicate_fact`        | Embedding similarity > 0.95 với fact đã có                    | "MC đột phá Kim Đan" lặp lại lần 2         |
| `thread_status_invalid` | Đóng thread đã `closed`, mở thread `archived`                 | Reopen "ai giết sư phụ" (đã closed)        |

#### 4.7 Anti-pattern

- **Canon quá nhiều `low` facts**: làm noise RAG. Định kỳ cleanup hoặc nâng threshold importance khi extract.
- **Locked tất cả mọi thứ**: Mọi update đều conflict → pending queue ngập. Lock chỉ nên dùng cho identity, key plot facts.
- **Không re-embed sau khi sửa fact**: Embedding stale → retrieve sai. Trigger re-embed khi fact text đổi.
- **`source_chapter` sai**: Khi human insert fact thủ công mà quên set, retrieval sẽ rank kém vì không biết recency.

---

### 5. Pending Canon Updates

#### 5.1 Khái niệm

Pending updates là **hàng đợi thay đổi canon đang chờ resolve**. Chúng tồn tại vì 2 lý do:

1. **Human-in-the-loop (mode safe)**: Operator muốn duyệt mọi thay đổi trước khi apply.
2. **Conflict detected**: Update tự động đụng với canon hiện tại → cần human quyết định.

#### 5.2 Cấu trúc

| Trường                      | Kiểu    | Vai trò                                                                                |
| --------------------------- | ------- | -------------------------------------------------------------------------------------- |
| `chapter_id`                | uuid    | Chapter sinh ra update này                                                             |
| `update_type`               | enum    | `character_update` / `new_fact` / `thread_update` / `timeline_event` / `seed_resolved` |
| `target_table`              | text    | Bảng đích nếu approve (`characters`, `canon_facts`, ...)                               |
| `target_id`                 | uuid    | Row id đích (null nếu insert mới)                                                      |
| `payload`                   | jsonb   | Dữ liệu sẽ apply                                                                       |
| `conflict_status`           | enum    | `none` / `conflict`                                                                    |
| `conflict_reasons`          | jsonb   | Mảng lý do (`["realm_regression", "duplicate_fact"]`)                                  |
| `resolution`                | enum    | `pending` / `approved` / `rejected`                                                    |
| `resolved_by`/`resolved_at` | text/ts | Audit trail                                                                            |

#### 5.3 Ma trận trạng thái

```
                 conflict_status=none           conflict_status=conflict
resolution=pending     ┌──────────────────────┐ ┌──────────────────────┐
                       │ Mode safe: chờ       │ │ Conflict thực sự:    │
                       │ human approve        │ │ ưu tiên review cao   │
                       │ (mode auto bỏ qua)   │ │ (mọi mode)           │
                       └──────────────────────┘ └──────────────────────┘
resolution=approved    ┌──────────────────────┐ ┌──────────────────────┐
                       │ Đã apply vào target  │ │ Human đã quyết:      │
                       │ table                │ │ override conflict    │
                       └──────────────────────┘ └──────────────────────┘
resolution=rejected    ┌──────────────────────┐ ┌──────────────────────┐
                       │ Hiếm (mode safe       │ │ Update bị từ chối,   │
                       │ override)            │ │ chapter có thể cần   │
                       │                      │ │ regenerate           │
                       └──────────────────────┘ └──────────────────────┘
```

#### 5.4 Liên kết với chapter status

```
Chapter status='generating'
   ↓ (canon extraction xong)
   ├── mode=auto + no conflicts → apply → status='completed'
   ├── mode=auto + có conflicts → conflicts vào pending → status='paused_pending_updates'
   └── mode=safe → tất cả vào pending → status='paused_pending_updates'

[Khi pending cuối cùng được resolve cho chapter này]
   ↓
Tự động UPDATE chapters SET status='completed' WHERE no remaining pending
```

#### 5.5 API workflow

```bash
# 1. Liệt kê pending của 1 story
curl GET /api/stories/:storyId/pending-updates?resolution=pending

# 2. Xem chi tiết 1 update
curl GET /api/stories/:storyId/pending-updates/:updateId

# 3a. Approve
curl -X POST /api/stories/:storyId/pending-updates/:updateId/approve

# 3b. Reject (kèm lý do)
curl -X POST /api/stories/:storyId/pending-updates/:updateId/reject \
  -d '{"reason": "Chapter viết sai, sẽ regenerate"}'
```

#### 5.6 Anti-pattern

- **Pending queue ngập sau vài chương**: Mode safe bật + không ai approve. Hoặc tắt safe, hoặc cron job auto-approve cho updates không-conflict.
- **Approve rồi vẫn không apply**: Có thể `target_table` không tồn tại hoặc `target_id` đã bị xóa. Check log.
- **Reject mà không regenerate chapter**: Chapter content vẫn nói "X xảy ra" nhưng canon không có → Writer chương sau bị mâu thuẫn. Phải regenerate hoặc edit thủ công content.

#### 5.7 Debug

```sql
-- Tổng quan pending của 1 story
SELECT update_type, conflict_status, count(*)
FROM pending_canon_updates
WHERE story_id='...' AND resolution='pending'
GROUP BY 1, 2;

-- Chapter nào đang stuck vì pending
SELECT c.chapter_number, c.status, count(p.id) AS pending_count
FROM chapters c
LEFT JOIN pending_canon_updates p ON p.chapter_id=c.id AND p.resolution='pending'
WHERE c.story_id='...' AND c.status='paused_pending_updates'
GROUP BY c.id, c.chapter_number, c.status;
```

---

### 6. Timeline

#### 6.1 Khái niệm

Timeline ghi lại **chuỗi sự kiện theo thứ tự thời gian** trong vũ trụ truyện. Khác với canon (lưu _what is true_), timeline lưu _when it happened_.

Ví dụ phân biệt:

- **Canon fact**: "Lâm Vân đã đột phá Kim Đan" (sự thật, không gắn thời gian).
- **Timeline event**: "Chương 50: Lâm Vân đột phá Kim Đan tại Tử Vong cốc, lúc trăng tròn" (có vị trí thời gian).

#### 6.2 Cấu trúc

```json
{
  "id": "uuid",
  "story_id": "uuid",
  "chapter_number": 50,
  "event_text": "Lâm Vân đột phá Kim Đan tại Tử Vong cốc",
  "importance": "major",
  "in_world_time": "Năm Khai Nguyên thứ 12, mùa thu",
  "related_character_ids": ["uuid-lam-van"],
  "related_thread_ids": ["uuid-tu-vong-coc-mystery"],
  "related_faction_ids": []
}
```

#### 6.3 Vì sao tách riêng khỏi canon?

- **Truy vấn theo thời gian**: "Cho tôi mọi sự kiện chương 100–200" — không cần embedding, dùng index theo `chapter_number`.
- **Build timeline view**: UI hiển thị dòng thời gian.
- **Detect anomaly**: Sự kiện không khớp với in-world time (vd: nhân vật đến nơi quá nhanh).

#### 6.4 Importance levels

| Mức       | Khi dùng                                      |
| --------- | --------------------------------------------- |
| `minor`   | Chi tiết phụ (gặp ai đó, đi đâu)              |
| `notable` | Có ý nghĩa cốt truyện (mở thread, plant seed) |
| `major`   | Đột phá, chiến đấu lớn, payoff seed           |
| `pivotal` | Plot-changing (chết nhân vật chính, climax)   |

#### 6.5 Anti-pattern

- **Trùng với canon facts**: Cả 2 đều ghi sự kiện. Quy ước: canon ghi _trạng thái sau sự kiện_, timeline ghi _bản thân sự kiện_. Trùng nội dung là chấp nhận được.
- **Quên `related_character_ids`**: Khó query "mọi event của nhân vật X". Canon Extractor phải link đầy đủ.

---

### 7. Seed / Planted Seed

#### 7.1 Khái niệm

Seed (hạt giống) là **kỹ thuật foreshadowing có cấu trúc**. Tác giả cài 1 chi tiết tưởng-như-vô-nghĩa ở chương sớm, rồi chương sau lộ ra ý nghĩa thật.

```
PLANT (chương 10):
"Lão ăn mày kỳ quặc đưa Lâm Vân một viên đá xanh đục, cười nhạt: 'Giữ kỹ, sau này dùng được'."
   ↓
[Chương 11–79: viên đá xuất hiện thoáng qua, đôi lần được đề cập]
   ↓
PAYOFF (chương 80):
"Lâm Vân đặt viên đá xanh vào ổ khóa cổ — viên đá nóng lên, mộ Tiên Đế từ từ mở ra..."
```

Hệ thống biến foreshadowing **từ may rủi thành deterministic**: seed có deadline phải plant, có chương payoff dự kiến, có validator bắt lỗi.

#### 7.2 Cấu trúc

| Trường                | Kiểu | Vai trò                                                          |
| --------------------- | ---- | ---------------------------------------------------------------- |
| `seed_key`            | text | Định danh duy nhất, vd: `"blue_stone_immortal_tomb_key"`         |
| `seed_text`           | text | Văn bản gốc khi plant (Writer phải đưa câu này hoặc tương đương) |
| `payoff_description`  | text | Mô tả payoff dự kiến (chỉ Packet Generator/Writer thấy)          |
| `plant_window_start`  | int  | Chương sớm nhất được plant                                       |
| `plant_window_end`    | int  | Chương muộn nhất được plant — _deadline cứng_                    |
| `payoff_chapter`      | int  | Chương payoff dự kiến (mềm)                                      |
| `status`              | enum | `pending` / `planted` / `paid_off` / `expired`                   |
| `planted_in_chapter`  | int  | Chương thực tế plant (set khi status=planted)                    |
| `paid_off_in_chapter` | int  | Chương thực tế payoff                                            |

#### 7.3 Lifecycle (state machine)

```
                         created (status=pending)
                                 │
                                 ▼
                     [chương ∈ plant window]
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
   [Writer mention seed]  [Writer skip]    [chapter > plant_window_end]
              │                  │                  │
              ▼                  ▼                  ▼
       status=planted     [retry next chapter]   status=expired
              │
              ▼
   [chương ≥ payoff_chapter]
              │
   ┌──────────┼──────────┐
   ▼                     ▼
[Writer payoff]   [Writer skip]
   │                     │
   ▼                     ▼
status=paid_off    [warning, retry hoặc expire]
```

#### 7.4 Vai trò Packet Auditor

Trước khi gọi Writer, Packet Auditor check:

```
For each seed in due_seeds (seed.plant_window_end <= currentChapter && status='pending'):
   if seed_key NOT in packet.requiredEvents:
      issue: critical "Seed quá hạn không được plant"

For each seed in payoff_due_seeds (seed.payoff_chapter <= currentChapter && status='planted'):
   if seed_key NOT mentioned in packet.requiredEvents:
      issue: high "Seed đến hạn payoff nhưng packet không có"
```

→ Nếu có critical → packet được regenerate với hint cụ thể.

#### 7.5 Ví dụ seed thật

```json
{
  "seed_key": "old_man_red_string",
  "seed_text": "Lão nhân áo rách rút từ tay áo một sợi dây đỏ, lặng lẽ buộc vào cổ tay Lâm Vân khi hắn say.",
  "payoff_description": "Sợi dây đỏ là pháp khí trấn ấn của Tiên Đế, sẽ tự động bảo vệ Lâm Vân khi gặp nguy hiểm chết người ở Vạn Thú Cốc (~chương 120).",
  "plant_window_start": 25,
  "plant_window_end": 35,
  "payoff_chapter": 120,
  "status": "planted",
  "planted_in_chapter": 28
}
```

#### 7.6 Anti-pattern

- **Quá nhiều seeds active**: Cold Tier ngập, Writer rối. Giới hạn 5–10 seeds active cùng lúc.
- **Seed plant_window quá ngắn**: 1 chương → dễ miss. Window 5–10 chương là sweet spot.
- **Quên cập nhật `status='paid_off'`**: Canon Extractor không detect được payoff → seed mãi ở `planted`. Phải dạy LLM extractor regex/keyword detect.
- **Payoff_description leak vào Writer prompt**: Writer biết kết quả → mất bất ngờ. Chỉ pass `seed_text` khi plant, chỉ pass `payoff_description` khi đến chương payoff.

---

### 8. Open Threads

#### 8.1 Khái niệm

Open thread là **plot thread đang mở** — câu hỏi/bí ẩn/conflict chưa giải quyết. Khác seed (cài cắm cụ thể), thread là _vấn đề mở_.

Ví dụ:

- Seed: "Lão ăn mày đưa viên đá xanh" → có payoff cụ thể.
- Thread: "Ai giết sư phụ Lâm Vân?" → có thể resolve nhiều cách, nhiều chương sau.

#### 8.2 Cấu trúc

| Trường                       | Kiểu  | Vai trò                                     |
| ---------------------------- | ----- | ------------------------------------------- |
| `title`                      | text  | "Ai giết sư phụ"                            |
| `description`                | text  | Chi tiết thread                             |
| `opened_chapter`             | int   | Chương mở thread                            |
| `planned_resolution_chapter` | int   | Chương dự kiến resolve (mềm)                |
| `status`                     | enum  | `open` / `resolved` / `closed` / `archived` |
| `priority`                   | enum  | `low` / `medium` / `high`                   |
| `related_character_ids`      | jsonb | Nhân vật liên quan                          |

#### 8.3 Vai trò trong context

- Active threads (status='open') → đi vào **Warm Tier** để Writer ý thức "vẫn còn câu hỏi này chưa trả lời".
- Overdue threads (`opened_chapter < currentChapter - 50` & vẫn open) → flag warning để Packet Generator ưu tiên resolve.

#### 8.4 Trạng thái

```
open ──[chapter resolves it]──► resolved
  │                                │
  └──[không còn relevant]──► archived

resolved ──(không cho phép reopen — conflict 'thread_status_invalid')──►
```

#### 8.5 Anti-pattern

- **Threads tích lũy không resolved**: Sau 100 chương có 30 thread open → Warm Tier ngập. Cần định kỳ archive hoặc resolve.
- **Reopen thread đã resolved**: Conflict Detector bắt. Nếu thực sự cần "twist" (kẻ giết sư phụ vẫn sống), tạo thread mới với link đến thread cũ.

---

### 9. Costs / LLM Costs

#### 9.1 Khái niệm

Mọi lần gọi LLM được log vào `llm_calls`. Đây là source of truth cho cost tracking, debugging retry, và audit.

#### 9.2 Cấu trúc

| Cột                     | Ý nghĩa                                          |
| ----------------------- | ------------------------------------------------ |
| `id`                    | PK                                               |
| `story_id`/`chapter_id` | FK (nullable)                                    |
| `agent_role`            | `bible_generator` / `writer` / `validator` / ... |
| `model`                 | Model string đầy đủ                              |
| `prompt_version`        | Version prompt khi gọi                           |
| `input_tokens`          | Input tokens                                     |
| `output_tokens`         | Output tokens                                    |
| `cached_input_tokens`   | Tokens hit prompt cache (provider-side)          |
| `estimated_cost_usd`    | numeric(10,6)                                    |
| `trace_id`              | Để correlate với log                             |
| `created_at`            | Timestamp                                        |

#### 9.3 Cost calculation

- Bảng giá hardcoded trong [packages/core/src/config/models.ts](packages/core/src/config/models.ts).
- Cost = `input_tokens × input_price + output_tokens × output_price - cached_input_tokens × cache_discount`.
- Nếu model không có trong bảng giá → cost = 0 (silent), nhưng log warning.

#### 9.4 Budget guardrails

| Mức                 | Default     | Hành vi khi vượt                  |
| ------------------- | ----------- | --------------------------------- |
| Per-chapter         | $0.05       | `BudgetGuard` throw, chapter fail |
| Per-story per-day   | $5          | Throw, batch dừng                 |
| Per-story per-month | $50         | Throw                             |
| Warning threshold   | 80% của cap | Log warning, không block          |

`BudgetGuard.preflightOrThrow()` chạy trước mỗi LLM call.

#### 9.5 Cost breakdown 1 chương điển hình

**Mode=safe, model=gemini-2.5-flash (free tier):**

```
Packet Generator:    ~3K in / 500 out  → $0
Packet Auditor:      ~1K in / 200 out  → $0
Writer:              ~6K in / 3K out   → $0
Deterministic:       0 LLM calls       → $0
LLM Validator:       ~6K in / 300 out  → $0
Auto-Fixer:          ~3K in / 3K out   → $0 (chỉ chạy nếu có issue)
Canon Extractor:     ~3K in / 800 out  → $0
Summary Compactor:   ~3K in / 500 out  → $0
Embedding:           1 call            → ~$0.0001
TOTAL:               ~$0.0001
```

**Cùng pipeline với Claude Sonnet 4 cho Writer:**

```
Writer:              ~6K in × $3/M + 3K out × $15/M  → $0.063
[Còn lại như trên]
TOTAL:               ~$0.063 (vượt $0.05 cap → fail!)
```

→ Nếu muốn dùng Sonnet: hoặc tăng cap, hoặc dùng Sonnet chỉ cho high_stakes_reviewer.

#### 9.6 Debug "chương quá tốn tiền"

```sql
-- 1. Breakdown theo agent
SELECT agent_role, count(*) AS calls, sum(input_tokens) AS in_tok,
       sum(output_tokens) AS out_tok, sum(estimated_cost_usd) AS cost
FROM llm_calls WHERE chapter_id='...' GROUP BY 1 ORDER BY cost DESC;

-- 2. Có retry không (cùng agent_role nhiều rows)
SELECT agent_role, count(*) FROM llm_calls
WHERE chapter_id='...' GROUP BY 1 HAVING count(*) > 1;

-- 3. Context có quá lớn không
SELECT total_input_tokens, hot_tier_hash FROM context_packets WHERE chapter_id='...';
```

Các nguồn cost ngoài dự kiến:

1. **Packet regenerate** vì auditor fail → +1 packet generator call.
2. **Auto-fixer** chạy → +1 fixer call (~ Writer cost).
3. **Completion retry** vì JSON malformed → x3 calls (parse-completion-json retry 3 lần).
4. **High-stakes reviewer** dùng Pro model → 1 call ~$0.10–0.20.
5. **Embedding fail retry** → x3 embed calls.

---

### 10. Context Packet & Chapter Packet

#### 10.1 Phân biệt 2 loại packet

| Loại               | Mục đích                                             | Tạo bởi                           | Đọc bởi            |
| ------------------ | ---------------------------------------------------- | --------------------------------- | ------------------ |
| **Chapter Packet** | Blueprint _NỘI DUNG_ chương (goal, events, conflict) | Packet Generator LLM              | Writer, validators |
| **Context Packet** | _CONTEXT_ đưa vào Writer (3 tier — Hot/Warm/Cold)    | Context Builder (code, không LLM) | Writer chỉ         |

Chapter Packet = "đề bài" cho Writer.
Context Packet = "tài liệu tham khảo" Writer được phép mở.

#### 10.2 Chapter Packet — chi tiết

```json
{
  "chapter_id": "uuid",
  "goal": "Lâm Vân khám phá mật thất trong Tử Vong cốc và đối đầu Trưởng lão Lý Hắc",
  "scene_setting": "Tử Vong cốc, đêm trăng tròn, sương mù dày",
  "requiredEvents": [
    "Tìm thấy bia đá khắc chữ cổ ngoài cửa mật thất",
    "Đụng độ và đấu khẩu với Lý Hắc",
    "Khám phá nửa đầu mật thất, gặp cơ quan ngăn cản"
  ],
  "charactersPresent": [
    { "name": "Lâm Vân", "role": "protagonist" },
    { "name": "Lý Hắc", "role": "antagonist" }
  ],
  "conflict": "Đối đầu giữa Lâm Vân (Trúc Cơ tầng 5) và Lý Hắc (Kim Đan tầng 2) — chênh lệch cảnh giới lớn",
  "cliffhanger": "Bia đá hiện chữ máu: 'Người đến sau, hãy trả giá bằng huyết mạch'",
  "forbiddenMoves": [
    "Không cho Lâm Vân giết Lý Hắc ở chương này (anti chương 75)",
    "Không cho đột phá cảnh giới",
    "Không tiết lộ identity Tiên Đế"
  ],
  "seedsToMention": ["blue_stone_immortal_tomb_key"],
  "seedsToPayoff": [],
  "expectedWordCount": 2800,
  "tone": "Tăng dần tension, climax ở giữa, kết với cliff"
}
```

#### 10.3 Context Packet — 3 Tier system

```
┌──────────────────────── HOT TIER (~2K tokens) ────────────────────────┐
│ Ít thay đổi giữa các chương — cache hit cao                            │
│ • System rules (rules of engagement với Writer)                        │
│ • Bible.compact_summary                                                │
│ • Bible.style_guide                                                    │
│ • Bible.cultivation_system (power rules)                               │
│ • Bible.style_few_shots (1-2 đoạn mẫu)                                 │
└────────────────────────────────────────────────────────────────────────┘
┌──────────────────────── WARM TIER (~2K tokens) ────────────────────────┐
│ Thay đổi theo arc — refresh khi đổi arc                                │
│ • Saga.rolling_summary (saga hiện tại)                                 │
│ • Arc.rolling_summary                                                  │
│ • Active characters (≤5, top traits, last_seen <= now+10)              │
│ • Open threads (status=open, priority high/medium)                     │
│ • Planted seeds đang active (status=planted)                           │
└────────────────────────────────────────────────────────────────────────┘
┌──────────────────────── COLD TIER (~2K tokens) ────────────────────────┐
│ Thay đổi mỗi chương — recompute every time                             │
│ • Recent summaries (5 chương gần nhất, short_summary)                  │
│ • Retrieved facts (RAG top-K theo packet.goal embedding)               │
│ • Past chapters (1-2 chapter cách min 5 chương — anti-recency-bias)    │
│ • Seeds to plant now (seed.plant_window_end <= currentChapter)         │
│ • Seeds to payoff now (seed.payoff_chapter <= currentChapter)          │
│ • Chapter Packet (the prompt itself)                                   │
└────────────────────────────────────────────────────────────────────────┘
                          TOTAL TARGET: 6K tokens (normal) / 10K (important)
```

Lưu trong `context_packets` table:

- `hot_tier_hash`: SHA-256 canonical JSON Hot Tier — để check cache hit.
- `warm_tier_hash`: tương tự cho Warm.
- `cold_payload`: JSONB, không hash vì luôn unique.
- `total_input_tokens`, `cached_input_tokens`: tracking.
- `config_snapshot`: full config khi build (model, budgets) → reproduce.

#### 10.4 Shrink algorithm (khi vượt budget)

```python
def shrink(context, budget):
    # Ưu tiên cắt: cold > warm > hot
    while estimate_tokens(context) > budget:
        if context.cold.past_chapters:
            context.cold.past_chapters.pop()  # bớt 1 past chapter
        elif len(context.cold.retrieved_facts) > 3:
            context.cold.retrieved_facts.pop()  # bớt 1 fact
        elif len(context.cold.recent_summaries) > 2:
            context.cold.recent_summaries.pop()  # giữ ít nhất 2
        elif len(context.warm.active_characters) > 3:
            context.warm.active_characters = compact(context.warm.active_characters)  # giảm chi tiết
        else:
            raise ContextOverflowError  # hot tier không cắt
```

Hot Tier bất khả xâm phạm — nếu Hot quá lớn, đó là bug Bible quá dài.

#### 10.5 Cache hit rate

Khi `hot_tier_hash` & `warm_tier_hash` của 2 chương liên tiếp giống nhau → provider có thể hit prompt cache (nếu enabled).

- Anthropic: cache hit giảm 90% input cost.
- OpenAI: cache hit giảm 50%.
- Gemini: implicit cache, ít tài liệu.

Đây là lý do kiến trúc 3-tier có ý nghĩa: Hot ổn định → cache hit → giảm cost.

#### 10.6 Anti-pattern

- **Hot Tier quá lớn (>4K)**: cache miss thường xuyên + chiếm budget. Compact bible.
- **Warm Tier có character đã chết**: Active filter không lọc theo `status`. Bug.
- **Cold Tier không có RAG facts**: embedding service down hoặc no facts với importance >= medium. Check.
- **Past chapters chọn quá gần**: min_gap=5 nhưng vẫn pick chương N-1 → recency bias. Tăng gap.

---

### 11. Chapter Summary

#### 11.1 Khái niệm

Sau khi chương viết xong, Summary Compactor LLM tóm tắt thành 2 phiên bản với mục đích khác nhau:

| Field              | Độ dài       | Dùng khi                                           |
| ------------------ | ------------ | -------------------------------------------------- |
| `short_summary`    | ~200 tok     | Cold Tier "recent summaries" (chương N+1, N+2,...) |
| `detailed_summary` | ~500 tok     | Input cho Arc Summary Compactor (gom 20–50 chương) |
| `embedding`        | vector(1536) | Semantic search ("chương nào nói về Tử Vong cốc?") |

#### 11.2 Vì sao cần 2 độ chi tiết?

- **Short**: cần nhỏ vì vào prompt mỗi chương → tốn budget.
- **Detailed**: cần đủ chi tiết vì khi gom 50 chương thành arc summary, lossy compression.
- Nếu chỉ có 1 phiên bản: short → arc summary mất chi tiết. detailed → Cold Tier ngập.

#### 11.3 Lifecycle

```
Chapter content (3000 từ)
   ↓ Summary Compactor LLM
{ short_summary, detailed_summary }
   ↓ INSERT chapter_summaries
   ↓ Embed short_summary (OpenRouter text-embedding-3-small)
   ↓ UPDATE chapter_summaries SET embedding=...
   ↓
[Chương sau cần retrieve]
   - Recent: query chapter_summaries WHERE chapter_number IN (N-5..N-1)
   - RAG: query với embedding similarity > 0.7

[Sau khi arc kết thúc]
   - refresh-arc-summary job lấy chapter_summaries.detailed_summary của arc
   - Compact thành arc.rolling_summary
```

#### 11.4 Anti-pattern

- **Embedding fail nhưng summary vẫn lưu**: RAG retrieve miss chương đó. Có job retry embedding nhưng cần monitor.
- **Detailed summary chứa câu trích nguyên văn**: lossy không phải lossless, đừng treat như source of truth. Để trích chính xác → đọc chapter.content.
- **Quên embed → quên retrieve**: Chương không có embedding sẽ vô hình với RAG. Nên có bg job: `SELECT id FROM chapter_summaries WHERE embedding IS NULL`.

---

### 12. Characters / Factions / Bloodlines

#### 12.1 Characters

##### 12.1.1 Cấu trúc

| Trường                   | Kiểu  | Vai trò                                                            |
| ------------------------ | ----- | ------------------------------------------------------------------ |
| `id`                     | uuid  | PK                                                                 |
| `name`                   | text  | Tên hiển thị                                                       |
| `aliases`                | jsonb | Mảng tên khác (đạo hiệu, biệt danh)                                |
| `role`                   | enum  | `protagonist` / `antagonist` / `supporting` / `minor`              |
| `current_realm`          | text  | Cảnh giới hiện tại (khớp Bible.cultivation_system)                 |
| `current_bloodlines`     | jsonb | Mảng bloodline_id                                                  |
| `status`                 | enum  | `alive` / `dead` / `missing` / `sealed` / `transformed`            |
| `last_seen_chapter`      | int   | Chương cuối xuất hiện                                              |
| `first_appeared_chapter` | int   | Chương đầu                                                         |
| `traits`                 | jsonb | Tính cách, ngoại hình, vũ khí                                      |
| `relationships`          | jsonb | Map character_id → relationship type                               |
| `locked_fields`          | jsonb | Mảng field name đã lock (`["current_bloodline", "true_identity"]`) |
| `affiliations`           | jsonb | Mảng faction_id                                                    |

##### 12.1.2 Active filter

Một character được coi là _active_ (đi vào Warm Tier) khi:

```
status IN ('alive', 'sealed', 'missing')
AND last_seen_chapter >= currentChapter - 10
```

Giới hạn 5 active để tránh ngập Warm Tier. Sort theo:

1. Role (protagonist > antagonist > supporting > minor)
2. last_seen_chapter (gần hơn ưu tiên)

##### 12.1.3 Locked fields

Khi field nằm trong `locked_fields`:

- Canon Extractor có thể đề xuất update → Conflict Detector flag `locked_field`.
- Pending update với `conflict_status='conflict'` → cần human approve override.
- Use case: identity của final boss (lock từ đầu để Writer không vô tình tiết lộ).

##### 12.1.4 Anti-pattern

- **`last_seen_chapter` cập nhật khi character xuất hiện trong flashback**: Character đã chết "active trở lại" → Writer dùng nó. Phân biệt: `last_seen_chapter` (bất kỳ mention) vs `last_active_chapter` (action thực).
- **Aliases không đầy đủ**: `unknown_character` validator báo false positive. Cần update aliases khi nhân vật có biệt danh mới.
- **Status=dead nhưng last_seen tăng do flashback** → dead_character validator không bắt vì check status, nhưng Writer có thể nhầm. Solution: skip flashback mention khi update.

#### 12.2 Factions

##### 12.2.1 Cấu trúc

```json
{
  "name": "Thiên Vân Tông",
  "type": "sect",
  "ideology": "Chính đạo, trọng đức, kỵ ma đạo",
  "power_level": "đại tông môn cấp 4 (trong 7 cấp)",
  "leadership": [{ "character_id": "...", "role": "tông chủ" }],
  "known_members": ["uuid-1", "uuid-2"],
  "rival_factions": ["uuid-huyet-sat"],
  "allied_factions": ["uuid-vo-cuc"],
  "headquarters": "Thiên Vân sơn, Trung Châu"
}
```

##### 12.2.2 Quan hệ

- Character.affiliations → faction.id (many-to-many qua array).
- Faction.relationships dùng cho conflict context.

#### 12.3 Bloodlines

##### 12.3.1 Khái niệm

Trong xianxia, bloodline (huyết mạch) là **gene siêu nhiên** — quyết định khả năng tu luyện, kỹ thuật khả dụng, thiên phú.

```json
{
  "name": "Huyết Ma huyết mạch",
  "rank": "thiên cấp",
  "source": "Huyết Ma Đại Đế cổ đại",
  "traits": [
    "tinh thông ma đạo",
    "máu có độc tính cao",
    "sợ ánh sáng tinh khiết"
  ],
  "evolution_path": [
    "sơ giai",
    "trung giai",
    "đại thành",
    "viên mãn",
    "thần cấp"
  ],
  "compatible_techniques": ["Huyết Ma Công", "Cửu Chuyển Huyết Đan"]
}
```

##### 12.3.2 Validator `new_bloodline_source`

Khi Canon Extractor tìm thấy character có bloodline mới:

- Bloodline đó có trong `bloodlines` table không?
- Source hợp lệ không (matches Bible.bloodline_system)?
- Awakening event có xuất hiện trong content không?

→ Nếu fail: severity=medium, không block, chỉ warn.

#### 12.4 Story Settings

##### 12.4.1 Khái niệm

Override config per-story trong `story_settings.overrides` (jsonb). Cấu trúc:

```json
{
  "models": {
    "writer": "anthropic/claude-sonnet-4",
    "high_stakes_reviewer": "openai/gpt-4.1"
  },
  "context": {
    "TOKEN_BUDGET_NORMAL": 8000,
    "TOKEN_BUDGET_IMPORTANT": 12000,
    "RECENT_SUMMARY_COUNT": 7,
    "RAG_TOP_K": 8
  },
  "generation": {
    "writer_temperature": 0.9,
    "writer_top_p": 0.95
  },
  "mode": "semi_auto"
}
```

##### 12.4.2 Precedence

```
Default config (hardcoded)
   ↓ override bởi
Global env config
   ↓ override bởi
story_settings.overrides
```

##### 12.4.3 Khi nào dùng?

- Story đặc biệt quan trọng → tăng context budget.
- Genre khác xianxia → tắt cultivation validators.
- Test model mới → override `models.writer` cho 1 story.

---

### Tóm tắt: Khi nào dùng khái niệm nào?

| Bạn muốn...                                      | Khái niệm       | Bảng                    |
| ------------------------------------------------ | --------------- | ----------------------- |
| Định nghĩa thế giới (luật, văn phong)            | Bible           | `story_bibles`          |
| Lập kế hoạch dài 1000 chương                     | Saga → Arc      | `sagas`, `arcs`         |
| Mô tả chi tiết 1 chương sắp viết                 | Chapter Packet  | `chapter_packets`       |
| Tài liệu tham khảo cho Writer                    | Context Packet  | `context_packets`       |
| Lưu sự thật bất biến (X chết, Y có huyết mạch Z) | Canon Fact      | `canon_facts`           |
| Theo dõi sự kiện theo thời gian                  | Timeline Event  | `timeline_events`       |
| Foreshadowing có deadline                        | Seed            | `planted_seeds`         |
| Câu hỏi/bí ẩn mở                                 | Open Thread     | `open_threads`          |
| Trạng thái nhân vật hiện tại                     | Character       | `characters`            |
| Tổ chức/thế lực                                  | Faction         | `factions`              |
| Hệ huyết mạch                                    | Bloodline       | `bloodlines`            |
| Tóm tắt chương đã viết (cho Writer chương sau)   | Chapter Summary | `chapter_summaries`     |
| Hàng đợi update canon chờ duyệt                  | Pending Update  | `pending_canon_updates` |
| Audit/cost tracking                              | LLM Call        | `llm_calls`             |
| Override config cho 1 story                      | Story Settings  | `story_settings`        |

---

## C. Giải thích database

### Tổng quan các bảng

| Table                   | Vai trò             | Cột quan trọng                                                                                | Liên hệ                                |
| ----------------------- | ------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------- |
| `stories`               | Gốc của mọi content | id, title, premise, genre, target_chapter_count                                               | Parent của hầu hết bảng khác (CASCADE) |
| `story_bibles`          | World building      | story_id, version, world_rules, cultivation_system, style_guide, forbidden_rules              | 1 story → N versions                   |
| `sagas`                 | Dài hạn             | story_id, saga_number, title, premise, rolling_summary, expected_turning_points               | Belongs to story; has many arcs        |
| `arcs`                  | Trung hạn           | story_id, saga_id, arc_number, title, main_conflict, seeds_to_resolve_in_arc, rolling_summary | Belongs to saga; has many chapters     |
| `chapters`              | Nội dung chương     | story_id, arc_id, chapter_number, title, content, status, word_count, validation_status       | Belongs to arc; has one packet/summary |
| `chapter_packets`       | Blueprint chương    | chapter_id, goal, required_events, characters_in_scene, conflict, cliffhanger                 | 1:1 với chapter                        |
| `chapter_summaries`     | Tóm tắt + embedding | chapter_id, short_summary, detailed_summary, embedding (vector 1536)                          | 1:1 với chapter                        |
| `context_packets`       | Cache context LLM   | chapter_id, hot_tier_hash, warm_tier_hash, cold_payload, total_input_tokens                   | 1:1 với chapter                        |
| `canon_facts`           | Facts đã xác nhận   | story_id, fact, source_chapter, importance, locked, embedding (vector 1536)                   | Belongs to story                       |
| `pending_canon_updates` | Queue updates       | story_id, chapter_id, update_type, target_table, payload, conflict_status, resolution         | Belongs to chapter                     |
| `timeline_events`       | Trình tự thời gian  | story_id, chapter_number, event_text, importance, related_character_ids                       | Belongs to story                       |
| `planted_seeds`         | Foreshadowing       | story_id, seed_key, seed_text, payoff_description, plant_window_start/end, status             | Belongs to story                       |
| `characters`            | Nhân vật            | story_id, name, current_realm, current_bloodlines, status, locked_fields                      | Belongs to story                       |
| `factions`              | Thế lực             | story_id, name, type, ideology, power_level, known_members                                    | Belongs to story                       |
| `bloodlines`            | Huyết mạch          | story_id, name, rank, source, traits, evolution_path                                          | Belongs to story                       |
| `open_threads`          | Plot threads        | story_id, title, opened_chapter, planned_resolution_chapter, status                           | Belongs to story                       |
| `validations`           | Kết quả validation  | story_id, chapter_id, pass, severity, issues, validator_model                                 | Belongs to chapter                     |
| `llm_calls`             | Log mọi lần gọi LLM | story_id, chapter_id, agent_role, model, input_tokens, output_tokens, estimated_cost_usd      | Optional FK                            |
| `llm_provider_settings` | Provider config     | provider, model_routes                                                                        | PK = provider name                     |
| `llm_provider_state`    | Active provider     | id='global', active_provider                                                                  | Singleton                              |
| `batches`               | Batch jobs          | story_id, start_chapter, end_chapter, mode, status, total_cost_usd                            | Belongs to story                       |
| `high_stakes_reviews`   | Review nghiêm ngặt  | story_id, chapter_id, trigger_reason, approve, concerns                                       | Belongs to chapter                     |
| `story_settings`        | Config per-story    | story_id, overrides (jsonb)                                                                   | 1:1 với story                          |

### Chi tiết từng bảng quan trọng

#### `stories`

- **Mục đích**: Root entity.
- **Cột quan trọng**: `target_chapter_count` (default 1000), `genre` (default 'xianxia_fantasy').
- **Quan hệ**: ON DELETE CASCADE xuống tất cả child tables.
- **Lỗi thường gặp**: Xóa story đồng nghĩa xóa toàn bộ data.

#### `chapters`

- **Mục đích**: Lưu nội dung chương và trạng thái.
- **Cột quan trọng**:
  - `status`: `draft` → `generating` → `completed` | `paused_pending_updates` | `failed`
  - `validation_status`: `pending` | `passed` | `failed`
  - `packet_audit_status`: `pending` | `audited`
  - `deterministic_validation`: JSONB lưu kết quả 12 checks
  - `llm_validation_id`: FK đến `validations.id`
- **Unique constraint**: (`story_id`, `chapter_number`)
- **Lỗi thường gặp**: `generating` status stuck nếu worker crash (không tự động timeout).

#### `pending_canon_updates`

- **Mục đích**: Queue human review cho canon changes.
- **Cột quan trọng**:
  - `resolution`: `pending` | `approved` | `rejected`
  - `conflict_status`: `none` | `conflict`
  - `conflict_reasons`: JSONB array
- **Index**: (`story_id`, `resolution`, `conflict_status`) để query nhanh.
- **Lỗi thường gặp**: Quên approve pending updates khiến chapter stuck ở `paused_pending_updates`.

#### `context_packets`

- **Mục đích**: Cache context để debug và tính cache hit rate.
- **Cột quan trọng**:
  - `hot_tier_hash`, `warm_tier_hash`: SHA-256 của canonical JSON
  - `total_input_tokens`, `cached_input_tokens`
  - `config_snapshot`: Lưu config lúc generate (để reproduce)
- **Lỗi thường gặp**: Hash mismatch nếu config thay đổi giữa các chương.

#### `llm_calls`

- **Mục đích**: Audit log và cost tracking.
- **Cột quan trọng**: `estimated_cost_usd` (numeric(10,6)), `trace_id`.
- **Lưu ý**: `story_id` và `chapter_id` nullable vì có thể gọi LLM không thuộc story nào (ví dụ: admin metrics).
- **Lỗi thường gặp**: Cost = 0 nếu dùng model free (gemini-2.5-flash), nhưng vẫn nên theo dõi token usage.

#### `llm_provider_settings` & `llm_provider_state`

- **Mục đích**: Quản lý provider và model routing.
- **CHECK constraints**:
  - `provider` IN ('openai-compatible', 'openrouter', 'ollama', 'vmlx')
  - `id = 'global'` (singleton)
- **Lỗi thường gặp**: Đổi provider nhưng model routes không tương thích → "model not found" ở worker.

---

## D. Flow sinh chương truyện

### D.0 Big picture

Generate-chapter là **pipeline 9 phase**, mỗi phase có thể thành công, fail, hoặc rẽ nhánh. Hiểu đúng pipeline giúp bạn:

- Biết chính xác failure xảy ra ở phase nào → debug đúng nơi.
- Biết phase nào idempotent (resume an toàn) vs phase nào không.
- Biết phase nào đắt tiền nhất → tối ưu đúng chỗ.

```
              ┌────────────────────────────────────────────────────┐
              │ INPUT: { storyId, chapterNumber, mode, traceId }   │
              └────────────────────┬───────────────────────────────┘
                                   ▼
       ┌───────────────────────────────────────────────────┐
       │ Phase 1: RESOLVE & SETUP                          │
       │ • Lookup arc, upsert chapter row (status=generating) │
       │ • Idempotency: nếu status=completed → return early │
       └────────────────────┬──────────────────────────────┘
                            ▼
       ┌───────────────────────────────────────────────────┐
       │ Phase 2: LOAD CONTEXT (DB queries, không LLM)     │
       │ • Bible, characters, threads, seeds, summaries    │
       └────────────────────┬──────────────────────────────┘
                            ▼
       ┌───────────────────────────────────────────────────┐
       │ Phase 3: PLAN PACKET                              │
       │ • Packet Generator LLM                            │
       │ • Packet Auditor (regex check) ──fail──► retry 1× │
       │ • Persist chapter_packets row                     │
       └────────────────────┬──────────────────────────────┘
                            ▼
       ┌───────────────────────────────────────────────────┐
       │ Phase 4: BUILD CONTEXT (code, không LLM)          │
       │ • Hot/Warm/Cold tier assembly                     │
       │ • RAG retrieval (embedding query)                 │
       │ • Shrink to budget                                │
       │ • Persist context_packets row                     │
       └────────────────────┬──────────────────────────────┘
                            ▼
       ┌───────────────────────────────────────────────────┐
       │ Phase 5: WRITE                                    │
       │ • Writer LLM (temperature=0.85)                   │
       │ • Parse title + content                           │
       └────────────────────┬──────────────────────────────┘
                            ▼
       ┌───────────────────────────────────────────────────┐
       │ Phase 6: VALIDATE                                 │
       │ • Deterministic (12 checks) ──critical──► FAILED  │
       │ • LLM Validator                                   │
       │ • Auto-Fixer (nếu low/medium)                     │
       └────────────────────┬──────────────────────────────┘
                            ▼
       ┌───────────────────────────────────────────────────┐
       │ Phase 7: CANON EXTRACT & MERGE                    │
       │ • Canon Extractor LLM                             │
       │ • Conflict Detector                               │
       │ • Apply (auto) hoặc enqueue pending (safe/conflict)│
       └────────────────────┬──────────────────────────────┘
                            ▼
       ┌───────────────────────────────────────────────────┐
       │ Phase 8: SUMMARIZE & EMBED                        │
       │ • Summary Compactor LLM                           │
       │ • Embed short_summary                             │
       └────────────────────┬──────────────────────────────┘
                            ▼
       ┌───────────────────────────────────────────────────┐
       │ Phase 9: FINALIZE                                 │
       │ • Update chapter status                           │
       │ • Enqueue refresh-arc-summary                     │
       │ • Enqueue high-stakes-review (nếu arc end)        │
       │ • Return { status, tokens, cost }                 │
       └───────────────────────────────────────────────────┘
```

### D.1 Mode quyết định flow nhánh nào?

Mode được pass vào job (`safe` / `semi_auto` / `full_auto`) và quyết định 2 điểm rẽ nhánh:

| Phase             | mode=safe                                  | mode=semi_auto                             | mode=full_auto                |
| ----------------- | ------------------------------------------ | ------------------------------------------ | ----------------------------- |
| Phase 6 (LLM Val) | critical/high → **PAUSED_PENDING_UPDATES** | critical/high → **PAUSED**                 | critical → PAUSED, high → log |
| Phase 7 (Canon)   | tất cả updates → pending (chờ approve)     | chỉ conflict → pending                     | chỉ conflict → pending        |
| Phase 9 status    | `paused_pending_updates` nếu có pending    | `completed` nếu no conflict, paused nếu có | `completed` nếu no conflict   |

→ `full_auto` là _yolo mode_, không nên dùng cho story quan trọng.

### D.2 Phase 1: Resolve & Setup

**Input**: `{ storyId, chapterNumber, arcId?, mode, traceId }`

**Steps**:

1. **Idempotency check**: `SELECT status FROM chapters WHERE story_id=? AND chapter_number=?`.
   - Nếu `completed` → return early, log "skip already completed".
   - Nếu `generating` → đây có thể là zombie (worker cũ crash). Log warning, tiếp tục (overwrite).
   - Nếu `paused_pending_updates` → log warning, không nên re-run. Operator nên approve/reject pending trước.
   - Nếu `failed` hoặc null → tiếp tục.

2. **Resolve arc**:
   - Nếu `arcId` có trong job → dùng.
   - Nếu không → `getArcForChapter(storyId, chapterNumber)`: tìm arc có `start_chapter <= N <= end_chapter`.
   - Nếu không có arc match → **fail early** (không thể tạo packet không có arc).

3. **Upsert chapter row**: `INSERT ... ON CONFLICT (story_id, chapter_number) DO UPDATE SET status='generating', updated_at=now()`.

**Failure modes**:

- Arc không tồn tại → `ChapterFailed("no arc for chapter N")`.
- DB connection lost → BullMQ ghi failed, retry manual.

### D.3 Phase 2: Load Context (DB only)

Đây là **batch query** load mọi thứ Packet Generator cần. KHÔNG gọi LLM.

```typescript
const ctx = {
  bible: await loadLatestBible(storyId), // story_bibles WHERE version=MAX
  saga: await loadCurrentSaga(storyId, chapterNumber), // sagas WHERE start <= N <= end
  arc: arc, // đã resolve ở phase 1
  activeCharacters: await loadActive(storyId, chapterNumber), // chars WHERE last_seen >= N-10 AND status IN (alive,sealed,missing)
  openThreads: await loadOpenThreads(storyId), // status='open'
  overdueThreads: await loadOverdueThreads(storyId, chapterNumber), // opened_chapter < N-50
  dueSeeds: await loadDueSeeds(storyId, chapterNumber), // plant_window_end <= N AND status='pending'
  payoffSeeds: await loadPayoffSeeds(storyId, chapterNumber), // payoff_chapter <= N AND status='planted'
  recentSummaries: await loadRecentSummaries(storyId, N, 5), // 5 chương trước, short_summary
  arcSummary: arc.rolling_summary,
  sagaSummary: saga.rolling_summary,
};
```

**Failure modes**:

- Bible không tồn tại (story chưa setup) → fail, gợi ý chạy `/bible` trước.
- Active characters > 100 (story to và lâu) → query chậm. Cần index `(story_id, last_seen_chapter, status)`.

### D.4 Phase 3: Plan Packet

Đây là phase **đắt tiền đầu tiên** (LLM call).

**Step 3a — Packet Generator LLM**:

- Input prompt include: `bible.compact_summary`, `arcSummary`, `recentSummaries[0..4]`, `activeCharacters` (compact), `openThreads`, `dueSeeds`, `payoffSeeds`, `forbidden_rules`, target chapter number.
- Output JSON schema: `ChapterPacket`.
- Dùng `parseCompletionJsonObject` để parse + retry 3 lần nếu JSON malformed.

**Step 3b — Packet Auditor** (deterministic, no LLM):

```
issues = []
- For each char in packet.charactersPresent:
    if char.status='dead' → issues += critical "dead_character_in_packet"
- For each seed in dueSeeds:
    if seed_key NOT in packet.seedsToMention/requiredEvents:
       issues += critical "due_seed_missing"
- For each seed in payoffSeeds:
    if seed_key NOT in packet.seedsToPayoff:
       issues += high "payoff_due_missing"
- if !packet.conflict OR len(packet.conflict) < 8:
    issues += high "missing_conflict"
- if !packet.cliffhanger OR len(packet.cliffhanger) < 8:
    issues += high "missing_cliffhanger"
- realmJumpCount = count(events có pattern "đột phá|breakthrough|cảnh giới mới")
  if realmJumpCount > 1:
    issues += critical "realm_jump_excess"
```

**Step 3c — Regenerate (max 1 lần)**:

- Nếu có critical/high issue → call Packet Generator lần 2 với hints field thêm vào prompt: `previousIssues: [...]`.
- Sau lần 2 vẫn fail → **vẫn proceed** (audit fail không block, chỉ best-effort), log warning. (Đây là design choice — block sẽ làm story stuck.)

**Step 3d — Persist**:

```sql
INSERT INTO chapter_packets (chapter_id, ...) ON CONFLICT DO UPDATE
UPDATE chapters SET packet_audit_status='audited'
```

**Failure modes**:

- LLM trả non-JSON 3 lần liên tiếp → retry exhausted, fail chapter.
- Packet thiếu `requiredEvents` (mảng rỗng) → audit không catch nhưng Writer có thể viết loãng.

### D.5 Phase 4: Build Context

Code-only phase, KHÔNG LLM (trừ embedding query).

**Step 4a — Assemble 3 tiers**: (xem mục B.10.3 để biết tier nào chứa gì)

**Step 4b — RAG retrieval**:

```typescript
const queryEmbedding = await embed(packet.goal); // 1 embedding call
const facts = await query(
  `
  SELECT *, 1 - (embedding <=> $1) AS similarity
  FROM canon_facts
  WHERE story_id = $2 AND importance >= 'medium'
  ORDER BY similarity DESC
  LIMIT $3  -- mặc định 5
`,
  [queryEmbedding, storyId, RAG_TOP_K],
);
```

**Step 4c — Estimate & shrink**:

```typescript
let tokens = estimateTokens(JSON.stringify(context)); // heuristic charCount/3.2
const budget = isImportant(chapter)
  ? TOKEN_BUDGET_IMPORTANT
  : TOKEN_BUDGET_NORMAL;
while (tokens > budget) {
  shrink(context); // pop pastChapters → facts → summaries → compact chars
  tokens = estimateTokens(JSON.stringify(context));
}
```

**Step 4d — Hash & persist**:

```typescript
const hotHash = sha256(canonicalize(context.hot));
const warmHash = sha256(canonicalize(context.warm));
await db.insert('context_packets', {
  chapter_id, hot_tier_hash: hotHash, warm_tier_hash: warmHash,
  cold_payload: context.cold, total_input_tokens: tokens,
  config_snapshot: { models, budgets, ... },
});
```

**Failure modes**:

- Embedding service down → catch, dùng empty `retrievedFacts` (degraded mode), log warn.
- Hot Tier alone > budget → throw `ContextOverflowError`. Bug Bible.

### D.6 Phase 5: Write

**Step 5a — Serialize**:
Context object → markdown string theo format cố định. Vd:

```
# SYSTEM RULES
{hot.systemRules}

# WORLD BIBLE (compact)
{hot.bibleSummary}

# STYLE GUIDE
{hot.styleGuide}
...
# CHAPTER PACKET (write this chapter)
Goal: {cold.packet.goal}
Required events: ...
```

**Step 5b — Writer LLM**:

- Model: theo route, default `gemini-2.5-flash`.
- Params: `temperature=0.85`, `top_p=0.95`, `max_tokens=8000`.
- Output **không phải JSON** — là plain text.

**Step 5c — Parse title & content**:

```typescript
function parseTitleAndContent(raw) {
  // Tìm "TITLE: ..." trong 200 ký tự đầu
  const match = raw.match(/^TITLE:\s*(.+?)$/m);
  if (match)
    return { title: match[1], content: raw.replace(match[0], "").trim() };
  // Fallback: dùng dòng đầu (max 80 chars) làm title
  const firstLine = raw.split("\n")[0].slice(0, 80);
  return { title: firstLine, content: raw };
}
```

**Failure modes**:

- Output rỗng (model refuse / safety filter) → fail.
- Output > max_tokens → bị cắt giữa câu, content xấu, vẫn proceed → validator sẽ catch.

### D.7 Phase 6: Validate

**Step 6a — Deterministic Validator**: 12 checks chạy tuần tự (xem mục F).

- Nếu có **critical** hoặc **high** → mark chapter FAILED, **return ngay** (skip phases 7-9).
- Nếu chỉ có medium/low → continue.

**Step 6b — LLM Validator**:

- Input: chapter content + style_guide + bible compact + character names.
- Output: `{ pass: bool, severity, issues: [...] }`.
- Nếu critical/high + (mode=safe hoặc mode=semi_auto) → mark `paused_pending_updates`, **return**.
- Nếu critical/high + mode=full_auto → log nhưng continue.
- Nếu medium/low → continue tới auto-fix.

**Step 6c — Auto-Fixer** (chỉ chạy nếu có medium/low issue):

- Input: chapter content + issues list + style guide.
- Output: chapter content sửa.
- Update `chapters.content` với phiên bản đã fix.
- **Không re-run validators** (tránh loop). Đặt cược vào fixer.

### D.8 Phase 7: Canon Extract & Merge

**Step 7a — Canon Extractor LLM**:

- Input: chapter content + active characters + bible context.
- Output schema:

```json
{
  "characterUpdates": [
    {
      "characterId": "...",
      "field": "current_realm",
      "value": "Kim Đan tầng 1"
    }
  ],
  "newFacts": [{ "fact": "...", "importance": "high" }],
  "threadUpdates": [{ "threadId": "...", "status": "resolved" }],
  "newThreads": [{ "title": "...", "description": "..." }],
  "timelineEvents": [{ "event_text": "...", "importance": "major" }],
  "seedsResolved": ["seed_key_1"],
  "seedsPlanted": ["seed_key_2"]
}
```

**Step 7b — Conflict Detector** (per update):

```
For each update:
  - locked_field check: target_table.locked_fields contains field?
  - realm_regression: new realm rank < current rank theo Bible.cultivation_system order
  - dead_character_action: characterId.status='dead' AND có action mới
  - duplicate_fact: cosine_sim(newFact.embedding, existingFact.embedding) > 0.95
  - thread_status_invalid: closed → reopen, archived → open
```

**Step 7c — Canon Merger**:

```
For each update:
  if mode == 'safe':
    INSERT pending_canon_updates (resolution=pending, conflict_status=detected)
  elif conflicts.length > 0:
    INSERT pending_canon_updates (resolution=pending, conflict_status='conflict')
  else:  # auto/semi_auto, no conflict
    APPLY directly to target_table (characters/canon_facts/...)
    INSERT pending_canon_updates (resolution=approved) for audit trail
```

### D.9 Phase 8: Summarize & Embed

**Step 8a — Summary Compactor LLM**:

- Input: chapter content (full).
- Output: `{ short_summary: ~200 tokens, detailed_summary: ~500 tokens }`.

**Step 8b — Embed short_summary**:

- 1 embedding call (OpenRouter `text-embedding-3-small`).
- Nếu fail → vẫn lưu summary với `embedding=NULL`, log error. Có job retry sau.

**Step 8c — Persist**:

```sql
INSERT INTO chapter_summaries (chapter_id, short_summary, detailed_summary, embedding)
ON CONFLICT (chapter_id) DO UPDATE
```

### D.10 Phase 9: Finalize

```typescript
const remainingPending = await countPendingForChapter(chapterId);
let finalStatus;
if (mode === "full_auto" || remainingPending === 0) {
  finalStatus = "completed";
} else {
  finalStatus = "paused_pending_updates";
}
await db.update("chapters", { status: finalStatus, completed_at: now() });

// Enqueue downstream jobs (chỉ nếu completed)
if (finalStatus === "completed") {
  await queue.refreshArcSummary.add({ storyId, arcId });
  if (chapterNumber === arc.end_chapter) {
    await queue.highStakesReview.add({
      storyId,
      chapterId,
      trigger: "arc_end",
    });
  }
}

return { status: finalStatus, tokens, cost };
```

### D.11 Idempotency & Resume Map

| Phase | Idempotent? | Resume khi nào?                                 |
| ----- | ----------- | ----------------------------------------------- |
| 1     | ✅          | Always — UPSERT row                             |
| 2     | ✅          | Pure read                                       |
| 3     | ⚠️          | Re-run sẽ tạo packet mới (cost lại)             |
| 4     | ✅          | UPSERT context_packets, deterministic build     |
| 5     | ⚠️          | Re-run = LLM call mới (random output mỗi lần)   |
| 6     | ✅          | Validators deterministic, LLM val có thể khác   |
| 7     | ❌          | Re-run sẽ duplicate canon updates               |
| 8     | ✅          | UPSERT chapter_summaries                        |
| 9     | ✅          | Update status, enqueue queue dedupe theo job ID |

→ Để resume an toàn từ failed: detect phase cuối đã complete (qua DB rows tồn tại), skip về phase tiếp theo. Hiện tại code KHÔNG support resume — re-run = chạy lại từ đầu (tốn cost). Đây là **technical debt** flag ở mục J.

### D.12 Cost map per phase (gemini-2.5-flash, free)

| Phase     | LLM calls             | Tokens (in/out típical) | Cost (USD)     |
| --------- | --------------------- | ----------------------- | -------------- |
| 1         | 0                     | 0                       | 0              |
| 2         | 0                     | 0                       | 0              |
| 3a        | 1 (packet)            | 4K / 800                | $0             |
| 3c        | 0–1 (regen if fail)   | 4K / 800                | $0             |
| 4         | 1 (embedding)         | 100 in                  | ~$0.00001      |
| 5         | 1 (writer)            | 6K / 3K                 | $0             |
| 6 LLM val | 1                     | 6K / 300                | $0             |
| 6 fix     | 0–1                   | 4K / 3K                 | $0             |
| 7         | 1 (extractor)         | 4K / 1K                 | $0             |
| 8         | 1 (compactor) + embed | 3K / 700                | ~$0.00001      |
| 9         | 0                     | 0                       | 0              |
| **TOTAL** | **5–8 LLM + 2 embed** | **~30K in / 9K out**    | **~$0** (free) |

Cùng pipeline với Claude Sonnet làm Writer + GPT-4 làm reviewer: ~$0.10–0.15/chương.

### D.13 Failure cascade & recovery

| Phase fail tại         | Chapter status sau fail  | Cách recover                                         |
| ---------------------- | ------------------------ | ---------------------------------------------------- |
| 1 (no arc)             | failed                   | Tạo arc bao chương đó, re-enqueue                    |
| 3 (LLM JSON malformed) | failed                   | Re-enqueue (LLM có thể tốt hơn lần sau)              |
| 4 (context overflow)   | failed                   | Compact Bible, re-enqueue                            |
| 5 (Writer empty)       | failed                   | Re-enqueue, hoặc đổi model                           |
| 6 (deterministic crit) | failed                   | Sửa nội dung underlying (Bible/canon) rồi re-enqueue |
| 6 (LLM val crit safe)  | paused_pending_updates   | Approve/reject pending hoặc regenerate               |
| 7 (extractor JSON)     | failed (sau khi đã viết) | **Phase 7 idempotency vấn đề** — manual fix          |
| 8 (embed fail)         | completed (degraded)     | Job riêng retry embedding                            |
| 9 (DB error)           | generating (zombie)      | Cron stale-job-detector reset → re-enqueue           |

---

## E. Jobs và worker

### Các job có trong hệ thống

| Job                    | Queue                  | Trigger                             | Mô tả                       |
| ---------------------- | ---------------------- | ----------------------------------- | --------------------------- |
| `generate-chapter`     | `generate-chapter`     | API POST /chapters/generate         | Sinh 1 chương               |
| `generate-batch`       | `generate-batch`       | API POST /batches                   | Sinh nhiều chương liên tiếp |
| `refresh-arc-summary`  | `refresh-arc-summary`  | Tự động sau mỗi chapter             | Tóm tắt arc                 |
| `refresh-saga-summary` | `refresh-saga-summary` | Tự động sau arc summary             | Tóm tắt saga                |
| `high-stakes-review`   | `high-stakes-review`   | Tự động (arc end) hoặc manual       | Review nghiêm ngặt          |
| `generate-export`      | `generate-export`      | API POST /exports (nếu >200 chương) | Xuất file                   |

### Queue system

- **BullMQ** + **IORedis**.
- Worker config:
  - `lockDuration: 600_000` (10 phút)
  - `maxStalledCount: 5`
  - `concurrency: 1` (hầu hết jobs)
  - `attempts: 1` (**không retry tự động**)

### Retry

- **Không có automatic retry** ở BullMQ level.
- Tuy nhiên:
  - Packet generation có 1 lần regenerate nội bộ nếu audit fail.
  - LLM completion có retry 3 lần với exponential backoff (parse-completion-json.ts).
  - Job type có `retryAttempt?: number` để track manual retry.

### Job Status

**Chapter status lifecycle:**

```
generating → completed
           → paused_pending_updates
           → failed
```

**Batch status lifecycle:**

```
running → completed
      → paused (nếu chapter paused)
      → failed (nếu chapter failed)
      → cancelled
```

### Logging

- Dùng **Pino** logger.
- Mọi job đều có `traceId`.
- `LOG_LLM_PROMPTS=1` để in prompt ra terminal.
- Job log ghi vào stdout (JSON format).

### Khi job fail

- Exception được catch, update DB `status='failed'`, sau đó re-throw để BullMQ đánh dấu failed.
- Job failed giữ lại 7 ngày (`removeOnFail: { age: 86400 * 7 }`).
- Xem log: tìm theo `traceId` hoặc `storyId` + `chapterNumber`.

### Khi job pause

- Nguyên nhân thường: mode=safe + có pending canon updates, hoặc LLM validator báo critical.
- Cách resume: approve/reject pending updates qua API → chapter tự động chuyển thành `completed`.

---

## F. Validations

### Mục đích

Đảm bảo chất lượng chapter trước khi coi là hoàn thành. Có 2 lớp:

1. **Deterministic Validator**: Regex-based, nhanh, không tốn tiền LLM.
2. **LLM Validator**: Soft quality check, tốn tiền, đánh giá voice/logic.

### Severity levels

| Level      | Ý nghĩa          | Hành động                                                                      |
| ---------- | ---------------- | ------------------------------------------------------------------------------ |
| `critical` | Lỗi nghiêm trọng | Short-circuit, chapter FAILED (deterministic) hoặc PAUSED (LLM + safe mode)    |
| `high`     | Lỗi nghiêm trọng | Tương tự critical trong packet-auditor; trong deterministic thì chapter FAILED |
| `medium`   | Lỗi trung bình   | Auto-fixer sửa (nếu deterministic pass)                                        |
| `low`      | Lỗi nhẹ          | Auto-fixer sửa hoặc bỏ qua                                                     |

### Danh sách 12 Deterministic Validators

| Validator              | Severity | Blocking | Mô tả                                                             |
| ---------------------- | -------- | -------- | ----------------------------------------------------------------- |
| `dead_character`       | critical | Có       | Nhân vật đã chết xuất hiện trong content                          |
| `realm_jump`           | critical | Có       | Quá 1 lần đột phá/chương                                          |
| `locked_fact`          | critical | Có       | Content nhắc đến topic của locked fact nhưng không chứa đúng fact |
| `forbidden_move`       | critical | Có       | Vi phạm forbidden rules (cấm kỵ)                                  |
| `word_count`           | medium   | Không    | < 1500 hoặc > 4000 từ                                             |
| `unknown_character`    | medium   | Không    | Xuất hiện tên nhân vật không trong danh sách                      |
| `unknown_location`     | low      | Không    | Xuất hiện địa điểm mới (khi có tiền vị từ chỉ nơi chốn)           |
| `new_bloodline_source` | medium   | Không    | Huyết mạch mới không hợp lệ                                       |
| `cliffhanger`          | low      | Không    | Thiếu hoặc quá ngắn cliffhanger (bỏ qua nếu chương cuối arc)      |
| `conflict_presence`    | medium   | Không    | Thiếu từ khóa xung đột                                            |
| `style_red_flags`      | medium   | Không    | Văn phong system novel, tục tĩu                                   |
| `repetition`           | low      | Không    | Câu lặp lại y hệt, bigram lặp                                     |

### Packet Auditor (chạy trước Writer)

| Kiểm tra                 | Severity      | Ý nghĩa                                         |
| ------------------------ | ------------- | ----------------------------------------------- |
| Dead character in packet | critical      | Nhân vật chết trong `charactersPresent`         |
| Unresolved due seed      | critical/high | Seed đến hạn nhưng không trong `requiredEvents` |
| Missing conflict         | high          | `conflict` thiếu hoặc < 8 ký tự                 |
| Missing cliffhanger      | high          | `cliffhanger` thiếu hoặc < 8 ký tự              |
| Realm jump excess        | critical      | > 1 realm jump trong `requiredEvents`           |

### Validation Result

- Lưu trong bảng `validations`.
- `chapters.deterministic_validation` lưu JSONB của deterministic checks.
- `chapters.llm_validation_id` FK đến `validations.id`.

### Debug validation error

1. Xem `chapters.deterministic_validation` để biết check nào fail.
2. Xem `validations` table để biết LLM validator nói gì.
3. Xem `llm_calls` để biết model nào, prompt nào.
4. Xem `context_packets.cold_payload` để biết context đưa vào.

---

## G. LLM Providers và Prompt System

### Providers được hỗ trợ

| Provider       | Env Var                             | Notes                                |
| -------------- | ----------------------------------- | ------------------------------------ |
| **OpenAI compatible** | `OPENAI_COMPATIBLE_API_KEY`, `OPENAI_COMPATIBLE_BASE_URL` | Default reusable endpoint |
| **OpenRouter**        | `OPENROUTER_API_KEY`                                      | Hỗ trợ nhiều model, có embedding API |
| **Ollama**            | `OLLAMA_API_KEY`, `OLLAMA_BASE_URL`                       | Local/self-hosted |

### Cách chọn model

1. **Default**: `google/gemini-2.5-flash` cho tất cả 10 agent roles (miễn phí).
2. **Admin cấu hình** qua `PUT /api/admin/models`:
   ```json
   {
     "bible_generator": "google/gemini-2.5-pro",
     "writer": "anthropic/claude-sonnet-4",
     "high_stakes_reviewer": "openai/gpt-4.1"
   }
   ```
3. **Sync calls** (Bible, Saga, Arc): API đọc model từ DB real-time.
4. **Async jobs** (Chapter, Batch): API capture snapshot `{ llmProvider, modelRoutes }` tại thời điểm enqueue. Worker dùng snapshot này, không đọc DB real-time (tránh race condition).

### Prompt Version

- Prompt được định nghĩa trong `packages/ai/src/prompts/*.v1.ts`.
- Registry pattern: `registerPrompt()` → `getPrompt(agentRole, version)`.
- Khi đổi prompt: sửa file `.v1.ts`, build lại, deploy.

### Debug lỗi provider

| Lỗi                           | Triệu chứng                          | Cách xử lý                                                                    |
| ----------------------------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| **404 model not found**       | Provider trả lỗi model không tồn tại | Kiểm tra `llm_provider_settings.model_routes` hoặc `MODEL_CONFIG.routes`      |
| **500 internal server error** | Provider crash                       | Retry (có sẵn trong parse-completion-json), hoặc đổi provider                 |
| **Invalid JSON output**       | Parser throw error                   | `parse-completion-json.ts` retry 3 lần; kiểm tra prompt có yêu cầu JSON không |
| **Context length exceeded**   | Token quá giới hạn model             | Giảm context budget, shrink tier, hoặc dùng model có context window lớn hơn   |
| **Timeout**                   | Job stall > 10 phút                  | Tăng `lockDuration` hoặc dùng model nhanh hơn                                 |
| **Rate limit**                | 429 Too Many Requests                | Thêm delay, hoặc dùng provider khác                                           |

---

## H. Trạng thái lỗi và cách xử lý

### 1. `paused_pending_updates`

**Nghĩa là gì?**
Chapter đã viết xong, nhưng các canon updates từ chương đó chưa được apply vào database.

**Tại sao xảy ra?**

- Mode `safe`: Tất cả canon updates đều đi vào pending để human review.
- Hoặc: LLM Validator báo critical/high issues ở mode `safe`.

**Dữ liệu nằm ở đâu?**

- Chapter row: `status = 'paused_pending_updates'`
- `pending_canon_updates`: các rows với `resolution = 'pending'` và `chapter_id = ?`

**Cần kiểm tra:**

```sql
SELECT * FROM pending_canon_updates
WHERE story_id = '...' AND chapter_id = '...' AND resolution = 'pending';
```

**Cách tiếp tục:**

```bash
# Duyệt từng update
curl -X POST /api/stories/:storyId/pending-updates/:updateId/approve
# Hoặc reject
curl -X POST /api/stories/:storyId/pending-updates/:updateId/reject
```

Khi hết pending updates, chapter tự động chuyển thành `completed`.

**Cách tránh lặp lại:**

- Dùng mode `semi_auto` hoặc `full_auto` nếu tin tưởng hệ thống.
- Hoặc: review và approve ngay sau khi chapter sinh ra.

### 2. Validation failed

**Kiểm tra:**

1. `chapters.deterministic_validation` → xem checks nào fail.
2. Bảng `validations` với `chapter_id = ?` → xem LLM validator nói gì.
3. `llm_calls` với `chapter_id = ?` → xem prompt và model.

**Phân biệt lỗi schema và lỗi nội dung:**

- Schema: Writer trả về không đúng format (không có `TITLE:`, JSON malformed). → Kiểm tra `parseTitleAndContent` hoặc `parseCompletionJsonObject`.
- Nội dung: Deterministic validator báo dead character, realm jump, forbidden move. → Sửa bible, canon, hoặc regenerate.

### 3. LLM provider error

| Lỗi              | Cách xử lý                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Model not found  | Kiểm tra `GET /api/admin/models`, đảm bảo model string đúng. Ví dụ: `google/gemini-2.5-flash` chứ không phải `gemini-2.5-flash`. |
| Provider 500     | Đợi và retry thủ công. Hoặc chuyển sang provider khác qua `PUT /api/admin/provider`.                                             |
| JSON malformed   | Kiểm tra `llm_calls` xem raw output. Có thể model không nghe lệnh trả JSON. Thử tăng temperature thấp hơn hoặc đổi model.        |
| Timeout          | Worker `lockDuration` là 10 phút. Nếu model quá chậm, tăng `lockDuration` hoặc dùng model nhanh hơn.                             |
| Rate limit       | Giảm concurrency, thêm delay giữa các request, hoặc dùng provider khác.                                                          |
| Context too long | Kiểm tra `context_packets.total_input_tokens`. Nếu > model limit, giảm `TOKEN_BUDGET_*` trong config hoặc shrink context.        |

### 4. Canon conflict

**Cách phát hiện:**

- `pending_canon_updates.conflict_status = 'conflict'`
- `conflict_reasons` chứa lý do: `locked_field`, `realm_regression`, `dead_character_action`, `duplicate_fact`, `thread_status_invalid`.

**Cách xử lý pending update:**

- Nếu conflict do **Bible sai** (ví dụ: Bible ghi 9 cảnh giới nhưng truyện cần 12) → Sửa Bible, sau đó approve update.
- Nếu conflict do **Chapter viết sai** (ví dụ: nhân vật đã chết lại xuất hiện) → Reject update, sau đó regenerate chapter.
- Nếu conflict do **locked field** (có người cố tình khóa field) → Quyết định manual: unlock hoặc reject.

**Khi nào sửa Bible vs sửa Chapter:**

- Sửa Bible khi: quy tắc thế giới cần mở rộng, hệ thống tu luyện thay đổi.
- Sửa Chapter khi: nhân vật chết bị hồi sinh, cảnh giới thụt lùi, fact sai so với canon.

### 5. Cost tăng bất thường

**Kiểm tra:**

1. `llm_calls` group by `agent_role`:
   ```sql
   SELECT agent_role, SUM(estimated_cost_usd) FROM llm_calls
   WHERE chapter_id = '...' GROUP BY agent_role;
   ```
2. Context size: `context_packets.total_input_tokens`.
3. Model: `llm_calls.model` — Pro models (GPT-4, Claude Opus) đắt hơn Flash models.
4. Retry: `llm_calls` có nhiều rows cùng `agent_role` cho 1 chapter → đang retry nhiều.
5. Prompt bị dài: `LOG_LLM_PROMPTS=1` để in ra kiểm tra.

**Ví dụ cost breakdown 1 chương (mode=safe, model=gemini-2.5-flash):**

- Packet Generator: ~$0 (flash free)
- Writer: ~$0
- LLM Validator: ~$0
- Auto-Fixer: ~$0 (nếu có)
- Canon Extractor: ~$0
- Summary Compactor: ~$0
- Embedding: ~$0.0001 (text-embedding-3-small)
- **Tổng: ~$0**

Nếu dùng model trả phí (GPT-4, Claude):

- Writer (~3K output): ~$0.03–0.06
- Validator + Extractor: ~$0.01–0.02
- **Tổng: ~$0.05–0.10/chương**

---

## I. Hướng dẫn vận hành thực tế

### Checklist: Generate một chapter mới

1. **Kiểm tra trước:**
   - [ ] Story đã có Bible (`GET /api/stories/:id/bible`)
   - [ ] Story đã có Sagas (`GET /api/stories/:id/sagas`)
   - [ ] Story đã có Arcs (`GET /api/stories/:id/sagas/:sagaId/arcs`)
   - [ ] Provider đang active (`GET /api/admin/provider`)
   - [ ] Budget chưa vượt (`GET /api/stories/:id/costs/summary`)

2. **Chạy:**

   ```bash
   curl -X POST /api/stories/:storyId/chapters/generate \
     -H "Content-Type: application/json" \
     -d '{"chapterNumber": 5, "mode": "semi_auto"}'
   ```

3. **Quan sát:**
   - SSE stream: `GET /api/stories/:storyId/chapters/:chapterNumber/stream`
   - Hoặc poll status: `GET /api/stories/:storyId/chapters/:chapterNumber/status`

4. **Kiểm tra output:**
   - `GET /api/stories/:storyId/chapters/:chapterNumber` để xem content.
   - `GET /api/stories/:storyId/costs/by-chapter` để xem cost.

5. **Nếu job không hoàn tất:**
   - Xem BullMQ dashboard (nếu có) hoặc log worker.
   - Tìm theo `traceId`.
   - Kiểm tra `chapters.status` trong DB.

### Checklist: Debug một chapter lỗi

**Truy từ storyId + chapterNumber:**

1. `SELECT * FROM chapters WHERE story_id = '...' AND chapter_number = N`
2. Lấy `chapter_id` từ kết quả.
3. `SELECT * FROM llm_calls WHERE chapter_id = '...' ORDER BY created_at`
4. `SELECT * FROM validations WHERE chapter_id = '...'`
5. `SELECT * FROM context_packets WHERE chapter_id = '...'`
6. `SELECT * FROM pending_canon_updates WHERE chapter_id = '...'`
7. `SELECT * FROM chapter_packets WHERE chapter_id = '...'`
8. Xem logs với `traceId` (từ `llm_calls` hoặc `chapters`).

### Checklist: Cải thiện chất lượng truyện

1. **Chỉnh prompt:**
   - Sửa file trong `packages/ai/src/prompts/*.v1.ts`
   - Build và deploy lại worker + API.

2. **Chỉnh Bible:**
   - `PUT /api/stories/:storyId/bible` để cập nhật world rules, style guide.
   - Bible mới sẽ tạo version mới (`story_bibles.version` tăng).

3. **Cập nhật canon:**
   - Insert/update `canon_facts` trực tiếp (nếu cần thiết).
   - Lock fact quan trọng: `PATCH /api/stories/:storyId/canon-facts/:factId/lock`.

4. **Tối ưu context packet:**
   - Điều chỉnh `story_settings.overrides.context` (token budgets, recent summary count).
   - Ví dụ: tăng `TOKEN_BUDGET_NORMAL` lên 10K nếu model hỗ trợ.

5. **Thêm validation mới:**
   - Thêm file trong `packages/ai/src/validators/deterministic/`
   - Register trong `runner.ts` (`buildChecks`).
   - Viết test trong `packages/ai/test/validators/deterministic/`.

---

## J. Đề xuất cải thiện hệ thống

### Điểm mạnh hiện tại

1. **Phân tầng context (Hot/Warm/Cold)** rất tốt, giúp kiểm soát token budget.
2. **Canon system với conflict detector** đảm bảo consistency cơ bản.
3. **Packet Auditor** bắt lỗi trước khi viết, tiết kiệm cost.
4. **Embedding + RAG** cho canon fact retrieval là giải pháp scalable.
5. **Hierarchical summaries** (Chapter → Arc → Saga) giúp nhớ dài hạn.
6. **Mode system** (`safe`/`semi_auto`/`full_auto`) linh hoạt cho operator.

### Rủi ro kỹ thuật

1. **Không có automatic retry** (`attempts: 1`). Nếu worker crash hoặc provider transient error, job stuck ở `failed`.
   - _Đề xuất:_ Thêm `attempts: 3` với backoff cho lỗi provider/network. Chỉ không retry nếu là validation fail.

2. **`generating` status stuck**. Nếu worker crash giữa chừng, chapter row vẫn ở `generating`.
   - _Đề xuất:_ Thêm heartbeat hoặc stale job detector (cron job reset `generating` > 30 phút).

3. **Token estimation heuristic** (`charCount / 3.2`) không chính xác cho tiếng Việt.
   - _Đề xuất:_ Thay bằng tokenizer của model đang dùng (ví dụ: `gpt-tokenizer` hoặc `tiktoken`).

4. **No index trên `llm_calls.chapter_id` hoặc `llm_calls.story_id` ngoài FK.**
   - _Đề xuất:_ Thêm index trên `llm_calls(story_id, created_at)` và `llm_calls(chapter_id, agent_role)` để query cost nhanh hơn.

### Rủi ro về chất lượng truyện

1. **Realm regression detector** chỉ hỗ trợ danh sách hardcoded (`phàm nhân`, `luyện khí`, ...).
   - Nếu truyện không phải tu tiên, detector vô dụng.
   - _Đề xuất:_ Lấy realm order từ `story_bibles.cultivation_system` hoặc config.

2. **Auto-fixer có thể làm hỏng văn phong** khi sửa nội dung.
   - _Đề xuất:_ Thêm option "skip auto-fix" hoặc giới hạn auto-fix chỉ sửa lỗi factual (không sửa prose).

3. **High-stakes reviewer chỉ chạy ở arc end**.
   - Nếu arc dài 100 chương, lỗi không được phát hiện sớm.
   - _Đề xuất:_ Thêm trigger: mỗi 20 chương hoặc khi validator severity tăng dần.

4. **Embedding retrieval dựa trên `packet.goal`**.
   - Nếu goal không liên quan đến fact cần retrieve, RAG miss.
   - _Đề xuất:_ Embed cả `packet.goal` + `packet.conflict` + `activeCharacters` names.

### Rủi ro về chi phí

1. **Batch không có checkpoint**. Nếu batch 30 chương fail ở chương 29, phải chạy lại từ đầu.
   - _Đề xuất:_ Lưu checkpoint sau mỗi chapter, hỗ trợ resume từ chapter bị fail.

2. **Deterministic validation chạy sau Writer**.
   - Nếu validation fail critical, Writer cost đã mất.
   - _Đề xuất:_ Packet Auditor mở rộng thêm kiểm tra forbidden moves và locked facts trước khi gọi Writer (hiện tại chỉ kiểm tra character/seed/conflict/cliffhanger/realm).

### Rủi ro về consistency khi truyện dài 1000 chương

1. **Arc summary refresh dựa trên 50 chapter summaries gần nhất**.
   - Nếu arc dài > 50 chương, early chapters bị quên.
   - _Đề xuất:_ Thêm hierarchical summary cho sub-arcs hoặc dùng sliding window với exponential decay.

2. **Canon facts không có TTL/deprecation**.
   - Sau 1000 chương, facts cũ có thể irrelevant nhưng vẫn được retrieve.
   - _Đề xuất:_ Thêm `chapter_range` hoặc `last_accessed_at` để ưu tiên facts gần đây.

3. **Character `last_seen_chapter` cập nhật không nhất quán**.
   - Nếu character xuất hiện qua flashback (đã chết), `last_seen_chapter` vẫn tăng → character được coi là "active".
   - _Đề xuất:_ Phân biệt `last_seen_chapter` (hiện tại) và `last_alive_chapter`.

### Phần nên refactor

1. **`generate-chapter.ts` quá dài (848 dòng)**.
   - Tách thành các phase riêng: `phase-packet.ts`, `phase-context.ts`, `phase-write.ts`, `phase-validate.ts`, `phase-canon.ts`.

2. **`CanonMerger.applyRow` dùng `switch` trên `target_table`**.
   - Khó mở rộng. Dùng strategy pattern hoặc registry.

3. **Deterministic validators dùng regex tiếng Việt**.
   - Có thể miss tên nhân vật có dấu, từ ghép. Cân nhắc dùng thư viện NLP tiếng Việt.

### Phần nên thêm test

1. **Integration test cho full pipeline** (từ packet → write → validate → canon).
2. **Conflict detector test** cho edge cases: realm custom, character resurrection hợp lý (ma đạo?), thread reopen.
3. **Context shrink test** đảm bảo không cắt nhầm hot tier.
4. **Batch resume test**.

### Command/tool nên thêm cho operator

1. **`novel-cli story :storyId status`**: Hiển thị tổng quan story (chapter count, pending updates, cost, last chapter status).
2. **`novel-cli chapter :storyId :chapterNumber debug`**: Tự động query tất cả bảng liên quan và tổng hợp báo cáo.
3. **`novel-cli pending approve-all :storyId`**: Approve tất cả pending updates của một story.
4. **`novel-cli batch resume :batchId`**: Resume batch bị pause/failed từ chapter cuối cùng completed.
5. **`novel-cli canon search :storyId "query"`**: Semantic search canon facts.

---

## Kết luận

Hệ thống Novel Factory là một pipeline agentic phức tạp nhưng có cấu trúc rõ ràng. Để vận hành ổn định:

- **Luôn bắt đầu với mode `safe`** cho đến khi tin tưởng pipeline.
- **Monitor `pending_canon_updates`** — đây là điểm nghẽn phổ biến nhất.
- **Theo dõi cost qua `llm_calls`** — dùng `gemini-2.5-flash` để tiết kiệm.
- **Debug theo traceId** — mọi component đều log với traceId.
- **Đọc context packet** khi chapter có vấn đề — context đúng thì output mới đúng.

Nếu có phần nào chưa rõ trong codebase hoặc cần bổ sung tính năng mới, hãy tham khảo phần [J. Đề xuất cải thiện](#j-đề-xuất-cải-thiện-hệ-thống) và ưu tiên theo thứ tự: retry mechanism → stale job detector → batch checkpoint.
