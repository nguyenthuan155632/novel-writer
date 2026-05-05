Đề xuất Kỹ thuật: Tái cấu trúc và Tối ưu hóa Hệ thống Deterministic Validators trong Novel Factory

1. Phân tích Hiện trạng và Động lực Thay đổi

Dựa trên phân tích kiến trúc tại tài liệu architecture.md (Mục F và D), quy trình sinh chương hiện tại đang gặp một rủi ro lớn về hiệu quả vận hành khi đặt các chốt chặn kiểm tra (Validation) chủ yếu tại Phase 6.

Vấn đề cốt lõi: Việc phát hiện các lỗi "Critical" hoặc "High" (như nhân vật đã chết xuất hiện hoặc nhảy cảnh giới sai) sau khi Writer LLM đã hoàn thành việc viết (Phase 5) gây ra sự lãng phí tài nguyên cực lớn. Theo định mức tại Mục D.12, một lần gọi Writer LLM tiêu tốn trung bình 6,000 input tokens và 3,000 output tokens. Nếu sử dụng các Pro Model (như Claude 3.5 Sonnet hay GPT-4o), chi phí cho mỗi chương lỗi dao động từ $0.03 đến $0.06. Việc hủy bỏ kết quả ở Phase 6 đồng nghĩa với việc lãng phí 100% chi phí của Phase 5.

Dưới đây là hiện trạng 12 Deterministic Validators đang được áp dụng:

Validator	Severity	Mô tả
dead_character	Critical	Nhân vật đã chết xuất hiện trong nội dung chương.
realm_jump	Critical	Đột phá vượt cấp không theo quy tắc trong Story Bible.
locked_fact	Critical	Vi phạm các sự thật đã được đánh dấu locked=true trong Canon Facts.
forbidden_move	Critical	Nội dung vi phạm các cấm kỵ (Forbidden Rules) định nghĩa trong Bible.
word_count	Medium	Số lượng từ không nằm trong khoảng 1500–4000 từ.
unknown_character	Medium	Xuất hiện tên nhân vật không có trong database hoặc Alias list.
unknown_location	Low	Xuất hiện địa điểm mới không có tiền vị từ chỉ nơi chốn hợp lệ.
new_bloodline	Medium	Huyết mạch mới xuất hiện không khớp với hệ thống trong Bible.
cliffhanger	Low	Thiếu hoặc đoạn kết kịch tính (cliffhanger) quá ngắn.
conflict_presence	Medium	Thiếu các từ khóa hoặc tình tiết thể hiện xung đột trung tâm.
style_red_flags	Medium	Vi phạm văn phong (sử dụng từ ngữ tục tĩu, phong cách hệ thống).
repetition	Low	Lặp lại câu văn hoặc lặp lại từ ngữ (bigram) quá mức.

2. Chiến lược Phân loại và Tái cấu trúc Validator

Để tối ưu hóa pipeline và giảm tỷ lệ "Stale Jobs", hệ thống cần phân loại lại 12 validator thành 3 nhóm xử lý chuyên biệt:

1. Nhóm Loại bỏ & Chuyển giao (LLM/Auto-Fixer Delegation):
  * Các kiểm tra mang tính cảm tính như style_red_flags, cliffhanger, conflict_presence, và repetition sẽ được loại bỏ khỏi lớp Deterministic. Trách nhiệm này được chuyển giao hoàn toàn cho LLM Validator (Phase 6b) để đánh giá định tính và Auto-Fixer (Phase 6c) để thực hiện các bản patch văn phong trực tiếp trên content.
2. Nhóm Hạ cấp (Downgrade to Warnings/Hints):
  * Các lỗi như word_count, unknown_character, unknown_location, và new_bloodline_source sẽ không còn quyền chặn đứng (block) quy trình. Thay vào đó, chúng được chuyển thành các "Hints" hoặc "Pending Updates" để người vận hành (Human-in-the-loop) duyệt hoặc làm đầu vào điều chỉnh cho các chương sau.
3. Nhóm Giữ lại & Nâng cấp Logic (Hard Constraints):
  * Giữ lại và nâng cấp triệt để 4 validator: dead_character, realm_jump, locked_fact, và forbidden_move. Đây là các "Hard Constraints" bắt buộc phải nhất quán với Story Bible và Canon Facts để bảo vệ tính logic của toàn bộ Saga.

3. Tái cấu trúc luồng thực thi (Execution Flow Refactoring) - Chiến lược Shift-Left

Để giải quyết rủi ro về chi phí (Mục J.2), đề xuất áp dụng kiến trúc Shift-Left Validation, đưa các logic kiểm tra trọng yếu từ Phase 6 lên Phase 3 (Packet Auditor).

Cơ chế hoạt động: Trước khi hệ thống gọi Writer LLM, Packet Auditor sẽ quét Chapter Packet (Blueprint). Nếu phát hiện vi phạm Hard Constraints trong các trường requiredEvents hoặc charactersPresent, hệ thống sẽ từ chối thực thi Phase 5. Thay vào đó, hệ thống kích hoạt cơ chế Regenerate Chapter Packet và gửi kèm mảng previousIssues (Hints) để Packet Generator sửa lại bản kế hoạch.

Sự thay đổi luồng thực thi:

* Luồng cũ (Hậu kiểm):
  1. Plan Packet (Tạo Blueprint)
  2. Write (Thực thi viết - Tiêu tốn $0.05/chương)
  3. Validate (Phát hiện lỗi logic -> Hủy bỏ chương -> Lãng phí 100% chi phí)
* Luồng Shift-Left đề xuất (Tiền kiểm):
  1. Plan Packet (Tạo Blueprint)
  2. Audit Packet (Shift-Left Validation)
    * Nếu phát hiện vi phạm (ví dụ: yêu cầu MC đột phá sai quy tắc):
      * Hủy lệnh gọi Writer.
      * Gửi lỗi về Phase 3 để Regenerate Packet (Chi phí cực thấp so với Writer).
    * Nếu Pass:
  3. Write (Thực thi viết trên một Blueprint đã sạch lỗi logic).

4. Chi tiết Nâng cấp Logic cho các Validator Trọng yếu

Nhằm giảm thiểu tỷ lệ "False Positive" và nâng cao độ chính xác theo các đề xuất tại Mục J, logic của các Validator Nhóm 3 được tái cấu trúc như sau:

* Realm Jump Validator (Dynamic Parsing):
  * Thay thế danh sách cảnh giới hardcoded bằng logic truy vấn động. Hệ thống phải parse trực tiếp trường cultivation_system (JSONB) từ bản ghi story_bibles tương ứng với phiên bản đang chạy. Validator sẽ xác định chỉ số (index) của từng cảnh giới trong mảng để tính toán khoảng cách đột phá, đảm bảo tính tương thích với mọi loại Genre (Tiên hiệp, Fantasy, hệ thống Level).
* Dead Character Validator (Context-Aware Check):
  * Tích hợp phân biệt trạng thái nhân vật. Hệ thống sử dụng trường last_alive_chapter để đối chiếu. Validator sẽ chỉ báo lỗi Critical nếu nhân vật có status='dead' nhưng lại xuất hiện trong requiredEvents với các hành động chủ động (Active actions). Nếu nhân vật chỉ xuất hiện trong last_seen_chapter dưới dạng hồi tưởng (flashback), hệ thống sẽ ghi nhận nhưng không chặn quy trình.
* Locked Fact Validator (Vector Similarity Search):
  * Thay vì quét từ khóa (Keyword matching) thô sơ, nâng cấp lên so sánh ngữ nghĩa (Semantic comparison). Packet Auditor sẽ thực hiện Vector Similarity Search giữa các câu lệnh trong requiredEvents của packet và các canon_facts có thuộc tính locked=true (dựa trên embeddings 1536-dim). Nếu độ tương đồng ngữ nghĩa chỉ ra sự mâu thuẫn, hệ thống sẽ thực hiện chặn ngay lập tức.

5. Tác động Dự kiến và Lộ trình Triển khai

Tác động Kinh tế & Kỹ thuật

* Tiết kiệm chi phí: Catching một lỗi "Critical" tại Phase 3 thay vì Phase 6 giúp tiết kiệm từ $0.03 đến $0.06 cho mỗi chương lỗi (tương đương 100% token cost của Writer LLM). Ước tính tổng chi phí vận hành cho một truyện 1000 chương giảm 15-20% nhờ giảm thiểu việc Regenerate Chapter.
* Tính nhất quán (Canon Consistency): Việc đối chiếu trực tiếp với JSONB Bible và Semantic Search Canon Facts đảm bảo sự ổn định của cốt truyện ngay cả khi truyện kéo dài hàng nghìn chương, nơi con người không thể kiểm soát hết các facts.

Lộ trình Triển khai

1. Giai đoạn 1 (Refactor Packet Auditor): Mở rộng Phase 3 để tích hợp 4 Hard Constraints. Cập nhật cơ chế truyền previousIssues để Regenerate Packet hiệu quả.
2. Giai đoạn 2 (Logic Upgrade): Triển khai Semantic Search cho Locked Facts và Dynamic Realm Parsing từ database. Cập nhật bảng characters thêm trường last_alive_chapter.
3. Giai đoạn 3 (Decommission): Gỡ bỏ các deterministic check dư thừa tại Phase 6. Chuyển giao toàn bộ việc kiểm tra văn phong cho LLM Validator và Auto-Fixer.

Kết luận: Việc chuyển dịch từ tư duy "Kiểm soát thiệt hại" sang "Ngăn ngừa lỗi từ gốc" thông qua kiến trúc Shift-Left là bước đi then chốt để Novel Factory đạt được hiệu suất tối ưu về cả kinh tế lẫn chất lượng nội dung.
