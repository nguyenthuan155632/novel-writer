### Đề xuất Nâng cấp Cơ chế Trạng thái và Tính Nhất quán cho Hệ thống Novel Factory

**Người soạn:**  Kỹ sư Hệ thống AI & Chuyên gia Kỹ thuật Prompt  **Ngày soạn:**  24/05/2024  **Phạm vi:**  Tài liệu Kiến trúc Hệ thống (Technical Specification)

##### 1\. Mục tiêu và Phạm vi Bản thảo

Tài liệu này đề xuất một lộ trình nâng cấp hệ thống  **Novel Factory**  từ cơ chế viết chương đơn lẻ (isolated writing) sang quy trình tạo nội dung có tính kế thừa trạng thái (stateful generation). Mục tiêu cốt lõi là giải quyết triệt để tình trạng lệch nhịp văn phong và mâu thuẫn logic giữa các chương kế tiếp bằng cách áp dụng cơ chế quản lý trạng thái (entry\_state), quy trình duyệt đa bước (Multi-pass) và tích hợp các lớp kiểm chứng dữ liệu (Deterministic Validation). Hệ thống sẽ chuyển đổi từ việc tạo văn bản thuần túy sang quản lý một dòng chảy logic nhất quán xuyên suốt hàng ngàn chương truyện.

##### 2\. Cải thiện Tính Liên tục của Chương (Chapter Continuity)

Để duy trì sợi dây liên kết mạch lạc giữa chương  $n$  và chương  $n+1$ , hệ thống cần một "bản lề" dữ liệu đủ mạnh.

###### *2.1. Cơ chế Tail\_Content và Quản lý Cache*

Hệ thống sẽ trích xuất 200-300 từ cuối cùng của chương  $n$  (đoạn kết) để làm dữ liệu "mồi" cho chương  $n+1$ .

* **Trích xuất:**  Agent  **Summary Compactor**  sẽ tự động lưu đoạn này vào trường tail\_content trong Chapter Summary.  
* **Vị trí lưu trữ (Warm Tier):**  Khác với các bản phác thảo trước đây, tail\_content sẽ được nạp vào  **Warm Tier**  thay vì Hot Tier. Việc này giúp bảo vệ hot\_tier\_hash của Story Bible, đảm bảo tỷ lệ hit-cache đạt trên 90% cho phần dữ liệu tĩnh nhất, đồng thời vẫn cung cấp đủ ngữ cảnh về nhịp văn và không khí (ambiance) cho Agent Writer.

###### *2.2. Trạng thái Đầu vào (entry\_state)*

Mỗi Chapter Packet sẽ mang theo một entry\_state dưới dạng JSON để Writer biết chính xác "điểm rơi" của nhân vật:  
{  
  "entry\_state": {  
    "location\_id": "settings\_uuid",  
    "timestamp": "timeline\_event\_id",  
    "pov\_character": {  
      "physical\_condition": "vết thương/kiệt sức",  
      "emotional\_state": "phẫn nộ/lo âu",  
      "immediate\_goal": "tìm nơi ẩn nấp",  
      "active\_knowledge": \["fact\_id\_1", "fact\_id\_2"\]  
    }  
  }  
}

Dữ liệu này sẽ nằm trong  **Warm Tier** , giúp Writer duy trì logic nhân vật mà không cần thực hiện suy luận (inference) từ các bản tóm tắt cũ.

##### 3\. Nâng cấp Hệ thống Canon và Bối cảnh (Consistency)

###### *3.1. Cơ chế active\_location (Lọc RAG theo Địa điểm)*

Dựa trên bảng settings trong Source Context, thuộc tính active\_location\_id sẽ được thêm vào Context Packet.

* **Logic RAG:**  Khi thực hiện tìm kiếm ngữ nghĩa cho Canon Facts, hệ thống sẽ sử dụng địa điểm hiện tại làm bộ lọc ưu tiên (Filter). Điều này ngăn chặn việc Agent nhầm lẫn quy tắc vật lý hoặc xã hội giữa các vùng bối cảnh khác nhau (ví dụ: nhân vật ở Shadow Markets nhưng lại hành xử theo quy tắc của Obsidian Spire).

###### *3.2. Quản lý Kiến thức Nhân vật (POV Knowledge Tracking)*

Áp dụng bài học từ NovelGenerator, hệ thống sẽ thực hiện lọc Canon dựa trên điểm nhìn của nhân vật chính (POV Character).

* **Canon Extractor:**  Khi trích xuất sự thật mới, Agent phải gán nhãn known\_by: character\_ids.  
* **Context Filtering:**  Khi xây dựng Chapter Packet, hệ thống sẽ cross-reference ID của nhân vật POV với mảng known\_by. Nếu một sự thật (fact) mang tính bí mật mà nhân vật hiện tại chưa biết, nó sẽ bị loại khỏi Context Packet để tránh việc LLM vô tình tiết lộ thông tin (leakage).

##### 4\. Quy trình Tác nhân Đa bước (Multi-pass Architecture)

Thay thế bước "Write" đơn nhất bằng quy trình 4 bước để tối ưu hóa chi phí và chất lượng:

* **Drafting Pass:**  Agent Writer tạo bản thảo thô dựa trên blueprint từ Chapter Packet.  
* **Deterministic Validation (Phase 6a):**  Chạy 12 bộ lọc regex (như dead\_character, realm\_jump, word\_count, forbidden\_move) trước khi gọi LLM. Bước này giúp bắt các lỗi logic cơ bản mà không tốn token.  
* **Logic/Style Pass (Handshake Agent):**  
* **LLM Validator**  sẽ kiểm tra voice/logic và xuất ra danh sách Issues (JSON) kèm Severity (Critical/High).  
* **Auto-Fixer**  nhận danh sách này như một "Patch Map" để sửa lỗi trực tiếp trên bản thảo.  
* **Polish Pass:**  Tinh chỉnh văn phong bằng style\_few\_shots từ Bible để đảm bảo tính nhạc và từ vựng đặc trưng của thể loại.*Lưu ý:*  Nếu phát hiện sự kiện đột phá cảnh giới hoặc nhân vật quan trọng tử vong, hệ thống sẽ kích hoạt  **High-Stakes Reviewer**  cho một phiên kiểm định độc lập với chi phí cao hơn.

##### 5\. Hệ thống Foreshadowing và Context Tiers

###### *5.1. Tối ưu hóa Context Tiers*

Thành phần,Cấu trúc Cũ,Cấu trúc Mới (Optimized),Mục tiêu  
Hot Tier,"Bible, Style Guide","Bible Compact, Style Guide",Giữ Hash tĩnh để Prompt Caching  
Warm Tier,Arc Summary,"Arc Summary,  Tail\_Content ,  Entry\_State",Cập nhật liên tục giữa các chương  
Cold Tier,RAG Facts,RAG Facts (Filtered by POV & Location),Tối ưu hóa độ liên quan của memory

###### *5.2. Cưỡng bức Hạt giống (Seed Enforcement)*

Agent  **Packet Generator**  sẽ tuân thủ quy tắc lập lịch hạt giống nghiêm ngặt:

* Nếu Current\_Chapter \>= (plant\_window\_end \- 2\) và seed\_status \== 'pending', hệ thống sẽ tự động đẩy hạt giống đó vào mục required\_events và đặt ưu tiên priority: critical. Điều này đảm bảo không có tình tiết cài cắm (foreshadowing) nào bị bỏ lỡ khi gần hết deadline.

##### 6\. Kế hoạch Tích hợp Database

Cần thực hiện các thay đổi schema sau để hỗ trợ cơ chế trạng thái:

* **Bảng**  **chapters**  **:**  Thêm cột tail\_content (text) để lưu đoạn văn bản đuôi chương.  
* **Bảng**  **characters**  **:**  Thêm cột knowledge\_ids (jsonb) để theo dõi các Fact nhân vật đã biết.  
* **Bảng**  **context\_packets**  **:**  Thêm active\_location\_id (uuid, Foreign Key liên kết với bảng settings).  
* **Bảng**  **pending\_canon\_updates**  **:**  Thêm quy trình xử lý xung đột tự động. Khi phát hiện realm\_regression hoặc dead\_character\_action, Auto-Fixer sẽ đề xuất phương án giải quyết (Resolve) để Human Reviewer chỉ cần nhấn "Approve".

##### 7\. Kết luận và Khuyến nghị

Để nâng cấp Novel Factory lên tiêu chuẩn viết chuyên nghiệp, chúng ta cần tập trung vào 3 cải tiến then chốt:

* **Bảo vệ Prompt Cache:**  Di chuyển các thành phần động (Tail\_Content, Entry\_State) sang Warm Tier để duy trì hiệu quả chi phí (tiết kiệm đến 90% input token nhờ cache hit ở Hot Tier).  
* **Lọc Memory theo POV:**  Sử dụng cơ chế known\_by để đảm bảo nhân vật hành động dựa trên kiến thức họ thực sự sở hữu, thay vì biết tuốt như AI.  
* **Kiểm chứng Đa tầng:**  Tích hợp 12 bộ lọc Deterministic trước khi chạy LLM Validation để loại bỏ các lỗi logic "ngây ngô" một cách rẻ nhất và nhanh nhất.
