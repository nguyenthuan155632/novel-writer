Báo cáo Phân tích và Tái cấu trúc Hệ thống Prompt - Novel Factory

Hệ thống Novel Factory vận hành dựa trên kiến trúc Multi-agent LLM chuyên biệt để sản xuất tiểu thuyết dài kỳ (500–1000 chương). Báo cáo này chuẩn hóa cấu trúc Prompt Engineering và cơ chế quản lý ngữ cảnh (Context Management) nhằm đảm bảo tính nhất quán (Consistency), khả năng mở rộng (Scalability) và tối ưu hóa chi phí (Cost Efficiency).


--------------------------------------------------------------------------------


1. Đánh giá Tổng quan Hệ thống Multi-agent Hiện tại

Hệ thống bao gồm 11 Agent phối hợp qua một "Recursive Memory Architecture". Kết quả đầu ra của Agent này là trạng thái đầu vào của Agent tiếp theo, được đồng bộ hóa qua cơ sở dữ liệu quan hệ và Vector DB.

Agent	Vai trò cốt lõi	DB Tables Impacted	Input chính	Output mong đợi
Bible Generator	Xây dựng thế giới	story_bibles	Premise (1 dòng)	World rules, Cultivation system
Saga Planner	Chiến lược dài hạn	sagas	Bible + Premise	Multi-saga roadmap (200-500 ch)
Arc Planner	Beats trung hạn	arcs	Current Saga + Bible	Danh sách Arcs (20-50 ch)
Packet Generator	Blueprint chương	chapter_packets	Arc Summary + Context	Chapter Slot (Goal, Events, Conflict)
Writer	Sáng tác nội dung	chapters	Chapter Packet + Context	Chương truyện (2000-3000 từ)
LLM Validator	Kiểm soát chất lượng	validations	Chapter + Style Guide	Issues list (Voice/Logic)
Auto-Fixer	Sửa lỗi nội bộ	chapters	Chapter + Issues	Patch nội dung đã sửa
High-Stakes Reviewer	Đánh giá nghiêm ngặt	high_stakes_reviews	Full Arc / Climax	Deep critique & Approval
Canon Extractor	Trích xuất sự thật	pending_canon_updates	Generated Chapter	Trích xuất Fact/Entity updates
Summary Compactor	Tóm tắt phân cấp	chapter_summaries	Chapter Content	Short (~200t) & Detailed (~500t)
Arc Compactor	Tóm tắt động	arcs, sagas	Past Summaries	Rolling Arc/Saga Summary


--------------------------------------------------------------------------------


2. Chiến lược Tối ưu hóa Context Overload (Hệ thống 3 Tầng)

Để xử lý giới hạn Context Window và tận dụng Prompt Caching, hệ thống sử dụng "Context Builder" (Code-side) để cấu trúc Context Packet theo 3 tầng (Tiers). Tính ổn định của phần đầu prompt được đảm bảo bằng cơ chế SHA-256 Hashing để kích hoạt Cache-hit từ Provider (Anthropic/OpenAI).

1. Hot Tier (Bất biến/Quy tắc tĩnh): Chứa compact_summary của Bible và Style Guide. Phần này được đặt ở đầu Prompt. Do ít thay đổi, Hash SHA-256 sẽ kích hoạt Cache hit 90% (Anthropic).
2. Warm Tier (Động/Kế hoạch): Chứa rolling_summary của Saga và Arc hiện tại, danh sách Active Characters (Protagonist/Antagonist ưu tiên). Phần này thay đổi sau mỗi 20-50 chương.
3. Cold Tier (RAG/Sự kiện): Chứa Canon Facts (Retrieve qua Vector Search), Planted Seeds và 5 Short Summaries gần nhất.

Thuật toán cắt giảm (Shrink Algorithm): Khi vượt quá TOKEN_BUDGET (Ví dụ: 10,000 tokens):

* Priority 1: Giữ nguyên Hot Tier.
* Priority 2: Nén Warm Tier bằng cách cắt giảm active_characters có last_seen_chapter cũ nhất.
* Priority 3: Lọc Cold Tier bằng cách tăng Threshold của RAG similarity hoặc tăng min_gap giữa các recent_summaries.


--------------------------------------------------------------------------------


3. Tái cấu trúc Quy trình Multi-pass Generation (Slot-based)

Quy trình chuyển đổi từ ý tưởng sang nội dung được thực thi qua cơ chế Slot-based, đảm bảo Writer không "đi chệch hướng".

Cấu trúc Chapter Packet (Slot):

Mỗi chương là một đối tượng JSON với các biến (Slots) bắt buộc:

* goal: Mục tiêu cốt lõi của chương.
* required_events: Mảng các sự kiện phải xảy ra (phục vụ logic).
* characters_present: Danh sách nhân vật xuất hiện (đối chiếu characters table).
* conflict: Xung đột chính để duy trì Tension.
* cliffhanger: Điểm mấu chốt để giữ chân độc giả.

Vai trò của Packet Auditor:

Trước khi gọi Writer, Agent này thực hiện Technical Audit:

* Check Due Seeds: Kiểm tra nếu có Seed nào đến hạn plant_window_end mà chưa có trong required_events.
* Check Open Threads: Nếu Thread có priority 'High' đã mở quá lâu mà chưa được nhắc tới.
* Check Character State: Đảm bảo không gọi nhân vật có status='dead'. Nếu Auditor phát hiện lỗi Critical, hệ thống sẽ thực hiện Regenerate Packet với chỉ thị (Hint) sửa lỗi.


--------------------------------------------------------------------------------


4. Tinh gọn System Prompt theo Nhóm Vai trò Agent

Thiết kế System Prompt sử dụng Delimiters (XML tags) để phân tách rõ ràng cấu trúc dữ liệu.

Khung Nhóm Planner (Bible, Saga, Arc, Packet)

# ROLE
Bạn là AI Strategic Architect chuyên về cấu trúc truyện dài kỳ.
# CONTEXT STRUCTURE
- <story_bible>: Quy tắc bất biến.
- <current_hierarchy>: Vị trí chương trong Saga/Arc.
# CONSTRAINTS
- Tuân thủ tính phân cấp: Chương phải phục vụ Arc, Arc phục vụ Saga.
- Đảm bảo "Ending Direction" không bị mâu thuẫn.
# OUTPUT FORMAT
Trả về JSON đúng Schema (Slot-based). Sử dụng Chain-of-Thought (CoT) trước khi xuất JSON.


Khung Nhóm Creator (Writer, Auto-Fixer)

# ROLE
Bạn là Senior Fiction Writer với văn phong chuyên biệt.
# CONTEXT STRUCTURE
- <chapter_packet>: Đề bài (Goal/Events).
- <style_guide>: Quy tắc tone/POV.
- <seeds>: Các hạt giống cần plant/payoff.
# CONSTRAINTS
- Tuyệt đối không tự bịa cảnh giới ngoài Bible.
- Tuân thủ Forbidden Rules (No gore/No repetition).
# OUTPUT FORMAT
Plain Text. Header: TITLE: [Tên chương]. Content: [Nội dung].


Khung Nhóm Monitor (Validator, Extractor, Compactor)

# ROLE
Bạn là Biên tập viên khắt khe và Logic Auditor.
# CONTEXT STRUCTURE
- <canon_context>: Trạng thái nhân vật/thế giới hiện tại.
# CONSTRAINTS
- Trích xuất sự thật khách quan, không thêm thắt.
- Phân loại mức độ quan trọng (Importance Levels) chính xác.
# OUTPUT FORMAT
JSON format cho Pending Updates hoặc Issues List.



--------------------------------------------------------------------------------


5. Cập nhật Prompt cho Canon Extractor và Memory Management

Hệ thống ghi nhớ (Memory) được quản lý qua canon_facts và pending_canon_updates.

Phân loại 5 Mức độ Quan trọng (Importance):

1. Low: Chi tiết bối cảnh nhỏ (Vd: Màu áo nhân vật phụ).
2. Medium: Thông tin thông thường (Vd: MC di chuyển đến thành phố mới).
3. High: Quan trọng (Vd: MC đạt được vũ khí mới).
4. Critical: Plot-critical (Vd: MC khám phá ra danh tính kẻ thù). Luôn ưu tiên RAG.
5. Locked: Bất khả xâm phạm (Vd: Hệ thống tu luyện). Không tự động update.

Nhận diện 5 loại xung đột Canon (Conflict Detection):

Agent Extractor phải gắn cờ (flag) nếu phát hiện:

* realm_regression: Cảnh giới mới thấp hơn cảnh giới hiện tại.
* dead_character_action: Nhân vật đã chết thực hiện hành động mới.
* locked_field: Thay đổi các trường đã bị khóa (Vd: true_identity).
* duplicate_fact: Trùng lặp fact (Cosine similarity > 0.95).
* thread_status_invalid: Resolve một thread đã đóng.

Cấu trúc Pending Update chuẩn mực:

Khi có xung đột, Chapter chuyển sang trạng thái paused_pending_updates.

{
  "chapter_id": "uuid",
  "update_type": "character_update",
  "payload": {
    "name": "Lâm Vân",
    "current_realm": "Kim Đan tầng 3",
    "status": "alive"
  },
  "conflict_status": "conflict",
  "conflict_reasons": ["realm_regression"],
  "resolution": "pending"
}



--------------------------------------------------------------------------------


6. Hệ thống Guardrails và Deterministic Validation

Sử dụng 12 Deterministic Validators để giảm tải chi phí và tăng độ chính xác trước khi gọi LLM Reviewer.

Phân cấp lỗi (Severity):

* Critical/High (Blocking): dead_character, realm_jump (>1 lần đột phá/chương), forbidden_move. Dừng hệ thống, yêu cầu Regenerate hoặc Manual Fix.
* Medium/Low (Non-blocking): word_count, cliffhanger thiếu, style_red_flags. Chuyển dữ liệu cho Auto-Fixer.

Cơ chế Auto-Fixer:

Auto-Fixer không viết lại toàn bộ chương. Nó nhận issues_list và thực hiện "Patching" tập trung vào các đoạn vi phạm, sau đó cập nhật trực tiếp vào trường content của bảng chapters.


--------------------------------------------------------------------------------


7. Tối ưu hóa Chi phí và Hiệu suất (LLM Costs)

Mô hình Hybrid Routing:

* Efficiency Tier (Gemini Flash): Sử dụng cho 80% tác vụ: Summary Compactor, Canon Extractor, Deterministic Validation. Chi phí gần như bằng 0.
* Creative Tier (Claude Sonnet 3.5 / GPT-4): Sử dụng cho 20% tác vụ quan trọng: Writer, High-Stakes Reviewer.

Tối ưu Prompt Caching:

* Hệ thống duy trì Hot Tier Stability. Hash của Bible và Style Guide được lưu trữ. Nếu Hash không đổi, Provider sử dụng Cache.
* Đối với Anthropic, Hot Tier phải được đặt ở vị trí đầu tiên của thông điệp System để tối ưu hóa việc định vị Cache.


--------------------------------------------------------------------------------


8. Kết luận và Danh mục Kiểm tra (Operational Checklists)

Checklist trước khi "Generate":

* [ ] Bible Version Sync: Xác nhận Bible version mới nhất đã đồng bộ hệ thống tu luyện.
* [ ] Arc Continuity: Kiểm tra chương hiện tại có thuộc phạm vi start_chapter và end_chapter của Arc.
* [ ] Budget Pre-flight: Chạy BudgetGuard.preflightOrThrow() để đảm bảo không vượt Cap ngày (5) hoặc tháng (50).
* [ ] Provider Health: Kiểm tra llm_provider_state xem OpenRouter/Gemini có đang active.

Technical Audit (Hậu kỳ):

* [ ] Embedding Check: Chạy query SELECT id FROM chapter_summaries WHERE embedding IS NULL để phát hiện lỗi RAG.
* [ ] Stale Job Detector: Kiểm tra các chương có status generating quá 30 phút để reset zombie workers.
* [ ] Pending Queue Review: Đảm bảo không có Update nào bị kẹt khiến pipeline bị Pause.
