ĐỀ XUẤT NÂNG CẤP KIẾN TRÚC HỆ THỐNG NOVEL FACTORY (PHIÊN BẢN TỐI ƯU)

Tài liệu này đề xuất các cải tiến kỹ thuật cho hệ thống Novel Factory (NF) nhằm giải quyết triệt để các rủi ro về tính nhất quán (Consistency) và hiệu năng vận hành. Đề xuất dựa trên việc tích hợp các cơ chế tiên tiến từ hệ thống NovelGenerator (NG) và tối ưu hóa hạ tầng sẵn có.


--------------------------------------------------------------------------------


1. Phân tích Khoảng trống Kỹ thuật & Đối chiếu NovelGenerator

Để đạt được khả năng tự động hóa hoàn toàn mà vẫn duy trì mạch truyện logic như NovelGenerator, hệ thống NF cần bổ sung các cơ chế điều phối dữ liệu sau:

Đặc tính	Novel Factory (Hiện trạng)	NovelGenerator (Tiêu chuẩn)	Khoảng trống Kỹ thuật (Gaps)
Cấu trúc luồng	Tuyến tính, tập trung vào nhân vật chính.	Multi-threaded narrative (Đa luồng đồng bộ).	Thiếu Global Timeline để đồng bộ trạng thái giữa các mạch truyện song song.
Trạng thái nhân vật	Theo dõi trạng thái vật lý (Cảnh giới, sống/chết).	Character Perspective Tracking (Kiến thức nhân vật).	Thiếu Knowledge State isolation (cách ly kiến thức) để tránh lỗi AI "biết tuốt" thông tin nhân vật chưa tiếp cận.
Logic nhân vật	Dựa trên sự kiện vật lý.	Emotional Arcs (Biến đổi tâm lý logic).	Thiếu State Machine để theo dõi sự biến đổi tâm lý theo chuỗi sự kiện.
Tính nhất quán	RAG dựa trên goal đơn giản.	Parallel plot synchronization.	Thiếu cơ chế kiểm soát Semantic Drift (lệch lạc ngữ nghĩa) trong các chương dài.


--------------------------------------------------------------------------------


2. Tối ưu hóa Cơ chế Context & Memory (Hệ thống 3 Tầng)

Tái cấu trúc luồng dữ liệu vào LLM để kiểm soát Token Overhead và tăng độ chính xác của ngữ cảnh.

* Hot Tier (Static Rules):
  * Yêu cầu Summary Compactor nén compact_summary xuống dưới 500 tokens.
  * Bảo tồn bắt buộc: Giữ nguyên forbidden_rules, cultivation_system và style_guide. Đây là các "luật cứng" không được phép mất mát trong quá trình nén để đảm bảo tính nhất quán của hệ thống tu luyện.
* Warm Tier (Dynamic State):
  * Flashback Tagging: Sử dụng last_active_chapter (hành động thực tế) thay vì last_seen_chapter.
  * Logic lọc: Nếu nhân vật có status = dead nhưng được nhắc đến trong chương hiện tại, hệ thống tự động gắn tag flashback thay vì đưa vào Warm Tier như một thực thể sống, tránh lỗi logic "hồi sinh" bất hợp lý (Lỗi 12.1.4).
* Cold Tier (RAG - Hybrid Search):
  * Thay thế truy vấn Vector đơn thuần bằng Hybrid Search. Tích hợp Keyword Search cho active_characters kết hợp với Vector Similarity cho packet.goal và packet.conflict.
  * Kỹ thuật này giúp lấy ra các Canon Facts liên quan trực tiếp đến các nhân vật hiện diện và xung đột cụ thể trong cảnh, giảm thiểu nhiễu thông tin (Noise).


--------------------------------------------------------------------------------


3. Nâng cấp Schema Dữ liệu & Quản lý Canon

Bổ sung các trường JSONB và cơ chế TTL (Time-to-Live) để quản lý bộ truyện 1000+ chương.

* Bảng characters: Thêm trường knowledge_state (JSONB) theo cấu trúc Map<FactID, ChapterNumber>. Writer Agent sẽ tham chiếu trường này để biết nhân vật A đã biết sự thật X từ chương nào, tránh leak thông tin từ nhân vật khác.
* Bảng canon_facts:
  * Bổ sung valid_until_chapter (int).
  * Logic truy vấn: Khi RAG hoạt động, câu lệnh thực thi phải kèm điều kiện: WHERE (current_chapter <= valid_until_chapter OR valid_until_chapter IS NULL). Điều này giúp tự động gỡ bỏ các sự thật về địa điểm/trạng thái đã lỗi thời trong các Saga sau.
* Bảng planted_seeds:
  * Cấu trúc lại trường status. Packet Auditor có nhiệm vụ quét các seed có plant_window_end sắp tới để ép Packet Generator phải đưa vào required_events.
  * Enforce logic: Phải có trạng thái planted trước khi cho phép trạng thái paid_off (foreshadowing trước, thu hoạch sau).


--------------------------------------------------------------------------------


4. Tối ưu hóa Prompt System & Agent Flow

Nâng cấp các Agent chuyên biệt theo phong cách kể chuyện chiều sâu của NovelGenerator.

* Writer Agent: Cập nhật Prompt tích hợp "Consistent Chronology" bằng cách tham chiếu Timeline Events của các mạch truyện song song. Yêu cầu LLM mô phỏng sự thay đổi tâm lý (Emotional Arcs) theo từng biến cố thay vì chỉ mô tả hành động.
* Canon Extractor: Chỉ thị Agent ưu tiên trích xuất "Relationship Shifts" (biến đổi quan hệ) và "Knowledge State Updates" thay vì chỉ tập trung vào các sự kiện vật lý đơn thuần.
* Packet Auditor (Pre-writing Validation): Di chuyển các bước kiểm tra "Forbidden Moves" và "Locked Facts" lên giai đoạn Planning (Phase 3). Hệ thống phải từ chối Chapter Packet và yêu cầu regenerate nếu kế hoạch vi phạm luật cứng, tránh lãng phí chi phí (Cost Overflow) cho Writer Agent.


--------------------------------------------------------------------------------


5. Cải thiện Hạ tầng Vận hành & Hệ thống Jobs

Xử lý các rủi ro "Stuck Jobs" và sai số chi phí thông qua cơ chế BudgetGuard và Heartbeat.

* Heartbeat & Stale Job Detector: Thiết lập cơ chế tự động reset các chương bị kẹt ở trạng thái generating. Dựa trên lockDuration (10 phút) của hệ thống, nếu job không có cập nhật trong >30 phút (gấp 3 lần lock), hệ thống sẽ tự động re-enqueue.
* Batch Checkpoint: Triển khai tính năng Batch Resume. Lưu trạng thái hoàn thành sau mỗi chương. Nếu batch 50 chương bị lỗi ở chương 30, người vận hành có thể Resume từ chương 30 thay vì chạy lại toàn bộ, giảm lãng phí tài nguyên.
* BudgetGuard Integration: Thay thế Heuristic Token Estimation (charCount/3.2) bằng Tokenizer thực tế của model (như gpt-tokenizer). Tích hợp vào phương thức BudgetGuard.preflightOrThrow() để kiểm soát ngân sách chính xác tuyệt đối trước khi gọi LLM.


--------------------------------------------------------------------------------


6. Quy trình Xử lý Xung đột & HITL (Human-in-the-loop)

Tự động hóa phê duyệt để giảm tải vận hành nhưng vẫn giữ quyền kiểm soát tại các điểm nút.

* Logic Auto-approve: Tự động phê duyệt các Pending Updates có conflict_status = none và importance = low. Chỉ đẩy về hàng đợi review các cập nhật có xung đột hoặc mức độ quan trọng high/critical/locked.
* Mandatory Regeneration: Thiết lập danh sách các tình huống bắt buộc phải Regenerate Chapter thay vì sửa Bible:
  * Vi phạm Locked Fact có tầm quan trọng critical.
  * Xung đột cốt lõi (Pivotal Conflict) như nhân vật đã chết xuất hiện hành động.
  * Cảnh giới thụt lùi (Realm regression) không theo logic truyện.


--------------------------------------------------------------------------------


7. Lộ trình Triển khai (Implementation Roadmap)

Lộ trình chia làm 3 giai đoạn để ưu tiên xử lý Technical Debt:

1. Giai đoạn 1 (Stability & Cost Control):
  * Xử lý Technical Debt về Idempotency & Resume để Batch Resume hoạt động ổn định.
  * Tích hợp Stale Job Detector (Heartbeat 30m).
  * Triển khai Tokenizer thực tế vào BudgetGuard.
2. Giai đoạn 2 (Consistency & Memory):
  * Nâng cấp Hybrid RAG và TTL cho Canon Facts.
  * Triển khai knowledge_state cho nhân vật và logic cách ly kiến thức.
  * Nâng cấp Packet Auditor kiểm tra Locked Facts/Forbidden Rules trước khi viết.
3. Giai đoạn 3 (Advanced Narrative):
  * Tích hợp Multi-threaded narrative và Global Timeline.
  * Cập nhật Prompt cho Writer về Emotional Arcs và Consistent Chronology.
