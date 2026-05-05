# https://github.com/KazKozDev/NovelGenerator

1. Kiến trúc Cốt lõi: Slot-Based Generation & Multi-Agent Coordinated System
   Thay vì để một Agent duy nhất (như Writer của bạn hiện tại) tự viết từ đầu đến cuối một chương, NovelGenerator chia nhỏ tiến trình này thông qua một hệ thống đa tác vụ tuần tự (Sequential execution) chia sẻ chung toàn bộ ngữ cảnh
   .
   Hệ thống sử dụng 4 Agent chuyên biệt hoạt động theo cơ chế điền vào chỗ trống (Slot-Based)
   :
   Bước 1 - Structure Agent (Kẻ tạo khung): Agent này không viết chi tiết ngay. Nó tạo ra một bộ khung văn bản (narrative framework) chứa các điểm neo (slots) như [DIALOGUE_SLOT], [ACTION_SLOT], và [DESCRIPTION_SLOT]
   .
   Bước 2 - Specialist Agents (Chuyên gia điền slot):
   Character Agent: Sẽ nhận các [DIALOGUE_SLOT] và điền vào đó các đoạn hội thoại, phát triển chiều sâu cảm xúc và đảm bảo tính nhất quán trong giọng điệu nhân vật
   .
   Scene Agent: Sẽ nhận các [DESCRIPTION_SLOT] hoặc [ACTION_SLOT] để đắp thêm không khí, chi tiết giác quan (sensory details) và các yếu tố xây dựng thế giới (world-building)
   .
   Bước 3 - Synthesis Agent (Kẻ tổng hợp): Đây là bước chốt chặn. Nó lấy toàn bộ output của các Specialist Agents, ráp lại với nhau, giải quyết các xung đột logic (nếu có), và sinh ra các đoạn văn chuyển cảnh (transitions) để chương truyện mượt mà
   .
2. Luồng tinh chỉnh Đa bước (Multi-pass Editing Pipeline)
   Để đạt được chất lượng tiệm cận con người mà không cần can thiệp thủ công, mỗi chương phải trải qua hơn 6 giai đoạn tinh chỉnh tuần tự
   . Quy trình này mất khoảng 5-10 phút cho mỗi chương
   :
   Bản nháp ban đầu (Initial Draft): Sinh ra từ hệ thống Slot-based ở trên
   .
   Sửa lỗi lặp từ (Repetition fixes): Agent quét và cấu trúc lại các từ/câu bị lặp
   .
   Kiểm tra tính liên tục (Continuity checks): Đối chiếu với các chương trước
   .
   Chỉnh sửa chuyên nghiệp (Professional polish): Lượt chạy cuối cùng (Final pass) chỉ tập trung vào nhịp độ (pacing), vần điệu câu văn (rhythm) và chiều sâu cảm xúc
   .
3. Cơ chế Quản lý Trí nhớ (Story Context Database)
   Để giữ logic cho một tiểu thuyết dài, hệ thống không chỉ tìm kiếm RAG theo ngữ nghĩa mà dùng Story Context Database (Cơ sở dữ liệu Ngữ cảnh Truyện) để theo dõi trạng thái liên tục (persistent tracking)
   . Nó quản lý ba khía cạnh sống còn
   :
   Trạng thái nhân vật (Character states): Theo dõi liên tục những gì một nhân vật đang biết tại một thời điểm cụ thể (what each character knows at any given moment), tránh lỗi nhân vật đột nhiên biết thông tin chưa được tiết lộ
   .
   Tuyến truyện (Plot threads): Đồng bộ hóa các luồng cốt truyện độc lập chạy song song, đảm bảo chúng hội tụ đúng lúc với một dòng thời gian (chronology) nhất quán
   .
   Dữ kiện thế giới (World facts): Lưu trữ các sự thật về bối cảnh
   .
4. Hệ thống Kiểm duyệt & Guardrails (Quality Validation)
   Bên cạnh việc sinh văn bản, hệ thống áp dụng các lớp kiểm duyệt theo thời gian thực (Real-Time Validation)
   :
   Anti-LLM Patterns: Hệ thống hardcode sẵn 16 từ cấm (forbidden words) thường thấy ở AI và 8 quy tắc viết cốt lõi để ép mô hình (chạy trên nền gemini-2.5-flash) viết tự nhiên hơn
   .
   Cân bằng nội dung (Content balance & Tone shifts): Tự động bắt các lỗi chuyển đổi giọng điệu đột ngột hoặc mất cân bằng giữa hội thoại và miêu tả
   .
   Adaptive JSON schemas: Định dạng dữ liệu động với cơ chế tự động fallback để đảm bảo AI luôn trả về cấu trúc chính xác
   .
   Bài học cốt lõi cho Novel Factory của bạn: Sự tinh vi của hệ thống này nằm ở việc tách biệt nhiệm vụ (Separation of Concerns). Thay vì dùng một Prompt khổng lồ như prompt-writer-v2 hiện tại của bạn, họ chia nhỏ thành việc "Tạo khung" → "Viết hội thoại" → "Viết cảnh quan" → "Tổng hợp" → "Đánh bóng văn phong". Cơ chế Slot-Based
   chính là lời giải hoàn hảo nhất để khắc phục tình trạng AI bị lệch nhịp, quên bối cảnh hoặc lan man khi phải tự viết liên tục 3000 chữ.
