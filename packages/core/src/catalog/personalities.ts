export type PersonalitySlug =
  | 'tram_on'
  | 'nong_bong_quyet_doan'
  | 'lanh_lung_tinh_toan'
  | 'hai_huoc_phong_khoang'
  | 'tu_duy_logic'
  | 'nghe_thuat_mong_mo'
  | 'bao_thu_ram_ro'
  | 'ngoan_cuong_bat_khuat'
  | 'thuc_dung_lanh_lung'
  | 'tu_tuong_gia_sau_sac'
  | 'tho_dan_hoang_da'
  | 'quan_su_nghiem_khac'
  | 'thuong_nhan_xa_giao'
  | 'dao_duc_cao_ca'
  | 'di_che_ham_muon'
  | 'bi_quan_u_am'
  | 'lac_quan_vo_tu'
  | 'tham_lam_vi_ki'
  | 'trung_thanh_tuyet_doi'
  | 'tri_tue sieu viet';

export interface PersonalityDef {
  slug: PersonalitySlug;
  viLabel: string;
  viDescription: string;
  voiceHints: string;
  decisionStyle: string;
  dialogueStyle: string;
  conflictResponse: string;
  driftSignals: string[];
}

export const PERSONALITIES: readonly PersonalityDef[] = [
  {
    slug: 'tram_on',
    viLabel: 'Trầm ổn, có trách nhiệm',
    viDescription: 'Nhân vật điềm tĩnh, suy nghĩ kỹ trước khi hành động, luôn đặt trách nhiệm và bổn phận lên hàng đầu.',
    voiceHints: 'Giọng văn trầm ổn, ít cảm xúc dâng trào, mô tả chi tiết và có chiều sâu, sử dụng câu văn dài và phức tạp.',
    decisionStyle: 'Phân tích tình huống từ nhiều góc độ, ưu tiên lợi ích tập thể, không bốc đồng.',
    dialogueStyle: 'Nói chuyện chậm rãi, chắc chắn, ít lờn vờn, thường dùng từ ngữ trang trọng và mang tính xây dựng.',
    conflictResponse: 'Tìm kiếm giải pháp hòa bình trước, chỉ dùng vũ lực khi không còn cách nào khác.',
    driftSignals: ['bất ngờ hành động bốc đồng', 'bỏ mặc trách nhiệm', 'trở nên vô cảm'],
  },
  {
    slug: 'nong_bong_quyet_doan',
    viLabel: 'Nóng bỏng, quyết đoán',
    viDescription: 'Nhân vật hành động nhanh, cảm xúc mãnh liệt, không ngại đưa ra quyết định táo bạo ngay lập tức.',
    voiceHints: 'Giọng văn nhanh, mạnh mẽ, nhiều động từ hành động, ít mô tả nội tâm, câu văn ngắn gọn và dứt khoát.',
    decisionStyle: 'Quyết định dựa trên trực giác và cảm xúc, hành động trước suy nghĩ sau.',
    dialogueStyle: 'Nói trực tiếp, mạnh bạo, ít nịnh hót, thường dùng mệnh lệnh hoặc thách thức.',
    conflictResponse: 'Đối đầu trực diện, không lùi bước, sẵn sàng đánh trước để chiếm ưu thế.',
    driftSignals: ['trở nên do dự', 'nói nhiều hơn làm', 'né tránh xung đột'],
  },
  {
    slug: 'lanh_lung_tinh_toan',
    viLabel: 'Lạnh lùng, tính toán',
    viDescription: 'Nhân vật lý trí, kiểm soát cảm xúc xuất sắc, luôn tính toán lợi ích trước mọi hành động.',
    voiceHints: 'Giọng văn khách quan, lạnh nhạt, mô tả chính xác như máy móc, ít phóng đại cảm xúc.',
    decisionStyle: 'Phân tích rủi ro và lợi ích một cách lạnh lùng, bỏ qua yếu tố cảm tính.',
    dialogueStyle: 'Nói ít nhưng chuẩn xác, giọng điệu lạnh nhạt, không bộc lộ cảm xúc qua lợi nói.',
    conflictResponse: 'Tìm cách thao túng tình huống từ phía sau, tránh đối đầu trực tiếp nếu không có lợi.',
    driftSignals: ['bộc lộ cảm xúc mạnh', 'hành động thiếu tính toán', 'nói nhiều và dài dòng'],
  },
  {
    slug: 'hai_huoc_phong_khoang',
    viLabel: 'Hài hước, phóng khoáng',
    viDescription: 'Nhân vật lạc quan, thích đùa cợt, sống phóng khoáng và không bị ràng buộc bởi quy tắc cứng nhắc.',
    voiceHints: 'Giọng văn nhẹ nhàng, dí dỏm, nhiều ẩn dụ hài hước, câu văn linh hoạt và bất ngờ.',
    decisionStyle: 'Dựa vào trực giác và cảm hứng, chấp nhận rủi ro để có trải nghiệm thú vị.',
    dialogueStyle: 'Nói chuyện hài hước, hay châm biếm, sử dụng ngôn ngữ bình dân và sáng tạo.',
    conflictResponse: 'Dùng hài hước để xoa dịu căng thẳng, né tránh hoặc tìm lối thoát bất ngờ.',
    driftSignals: ['trở nên nghiêm túc quá mức', 'mất đi sự sáng tạo', 'trầm uất và ít nói'],
  },
  {
    slug: 'tu_duy_logic',
    viLabel: 'Tư duy logic',
    viDescription: 'Nhân vật suy nghĩ theo hệ thống, yêu thích giải quyết vấn đề bằng lý trí và bằng chứng.',
    voiceHints: 'Giọng văn có cấu trúc rõ ràng, diễn giải logic từng bước, ít cảm xúc chủ quan.',
    decisionStyle: 'Thu thập thông tin, phân tích dữ kiện, đưa ra quyết định dựa trên bằng chứng.',
    dialogueStyle: 'Nói chuyện có hệ thống, đặt câu hỏi sắc bén, tránh phán đoán vội vàng.',
    conflictResponse: 'Tìm lỗ hổng logic của đối phương, dùng lý lẽ để phản bác và giải quyết.',
    driftSignals: ['đưa ra quyết định cảm tính', 'bỏ qua bằng chứng', 'trở nên mơ hồ trong suy luận'],
  },
  {
    slug: 'nghe_thuat_mong_mo',
    viLabel: 'Nghệ sĩ, mộng mơ',
    viDescription: 'Nhân vật sống bằng cảm xúc và trí tưởng tượng, đam mê cái đẹp và thường xa rời thực tế.',
    voiceHints: 'Giọng văn bay bổng, nhiều ẩn dụ thi ca, mô tả cảnh vật và cảm xúc tinh tế, câu văn uyển chuyển.',
    decisionStyle: 'Dựa vào cảm hứng và giá trị thẩm mỹ, ưu tiên điều đẹp đẽ hơn thực dụng.',
    dialogueStyle: 'Nói chuyện trữ tình, hay dùng ẩn dụ, thường lan man và bay bổng.',
    conflictResponse: 'Trốn vào thế giới nội tâm hoặc dùng nghệ thuật và cái đẹp để đối phó.',
    driftSignals: ['trở nên thực dụng', 'mất đi trí tưởng tượng', 'câu văn trở nên khô khan'],
  },
  {
    slug: 'bao_thu_ram_ro',
    viLabel: 'Báo thù, rầm rộ',
    viDescription: 'Nhân vật bị thúc đẩy bởi hận thù, hành động quyết liệt và không ngần ngại trả thù.',
    voiceHints: 'Giọng văn u ám, căm hận, nhiều hình ảnh máu lửa và hủy diệt, nhịp điệu nhanh và dồn dập.',
    decisionStyle: 'Ưu tiên mục tiêu báo thù, sẵn sàng hy sinh mọi thứ để đạt được mục đích.',
    dialogueStyle: 'Nói ít nhưng sắc nhọn, đầy mỉa mai và thù hận, thường đe dọa hoặc chế giễu.',
    conflictResponse: 'Tấn công không khoan nhượng, tìm cách triệt hạ hoàn toàn kẻ thù.',
    driftSignals: ['tha thứ dễ dàng', 'quên mục tiêu báo thù', 'trở nên mềm yếu'],
  },
  {
    slug: 'ngoan_cuong_bat_khuat',
    viLabel: 'Ngoan cường, bất khuất',
    viDescription: 'Nhân vật có ý chí sắt đá, không bao giờ chịu cúi đầu trước áp lực hay kẻ thù mạnh hơn.',
    voiceHints: 'Giọng văn kiên định, mạnh mẽ, ít thay đổi cảm xúc, tập trung vào ý chí và quyết tâm.',
    decisionStyle: 'Giữ vững lập trường, không thỏa hiệp nguyên tắc, chấp nhận đau khổ để bảo vệ niềm tin.',
    dialogueStyle: 'Nói chuyện cứng rắn, thẳng thắn, không nịnh bợ, giọng điệu kiên quyết.',
    conflictResponse: 'Đối đầu trực tiếp, không lùi bước, sẵn sàng chịu đựng đau đớn để chiến thắng.',
    driftSignals: ['đầu hàng dễ dàng', 'thay đổi nguyên tắc', 'trở nên yếu đuối tinh thần'],
  },
  {
    slug: 'thuc_dung_lanh_lung',
    viLabel: 'Thực dụng, lạnh lùng',
    viDescription: 'Nhân vật coi trọng kết quả hơn phương tiện, lạnh lùng trong mọi quyết định và không để cảm xúc xen vào.',
    voiceHints: 'Giọng văn khô khan, súc tích, tập trung vào hành động và kết quả, ít mô tả cảm xúc.',
    decisionStyle: 'Chọn phương án hiệu quả nhất, bất chấp đạo đức nếu cần, đo lường mọi thứ bằng lợi ích.',
    dialogueStyle: 'Nói thẳng vào vấn đề, không vòng vo, giọng điệu lạnh nhạt và thiếu cảm xúc.',
    conflictResponse: 'Loại bỏ chướng ngại vật một cách hiệu quả, sử dụng mọi thủ đoạn cần thiết.',
    driftSignals: ['bị cảm xúc chi phối', 'đưa ra quyết định phi thực tế', 'trở nên do dự'],
  },
  {
    slug: 'tu_tuong_gia_sau_sac',
    viLabel: 'Tư tưởng gia, sâu sắc',
    viDescription: 'Nhân vật triết gia, luôn suy tư về ý nghĩa cuộc sống, đạo đức và số phận con người.',
    voiceHints: 'Giọng văn triết lý, sâu lắng, nhiều câu hỏi và suy ngẫm, câu văn dài và phức tạp.',
    decisionStyle: 'Cân nhắc ý nghĩa đạo đức và triết học, ưu tiên sự thật và chính nghĩa lâu dài.',
    dialogueStyle: 'Nói chuyện sâu sắc, hay trích dẫn và ẩn dụ, thường đặt câu hỏi triết học.',
    conflictResponse: 'Tìm kiếm ý nghĩa sau xung đột, cố gắng thuyết phục bằng triết lý hơn vũ lực.',
    driftSignals: ['trở nên nông cạn', 'bỏ qua khía cạnh đạo đức', 'hành động vô suy nghĩ'],
  },
  {
    slug: 'tho_dan_hoang_da',
    viLabel: 'Thổ dân, hoang dã',
    viDescription: 'Nhân vật gần gũi với thiên nhiên, sống theo bản năng, mạnh mẽ và không bị văn minh ràng buộc.',
    voiceHints: 'Giọng văn thô ráp, gần gũi thiên nhiên, mô tả giác quan và bản năng, câu văn ngắn và mạnh.',
    decisionStyle: 'Theo bản năng và kinh nghiệm sinh tồn, tin vào giác quan hơn lý trí.',
    dialogueStyle: 'Nói ít, thẳng thắn, sử dụng ngôn ngữ tự nhiên và thô, không quan tâm lễ nghi.',
    conflictResponse: 'Phản ứng bản năng, tấn công hoặc chạy trốn nhanh chóng, dựa vào thể chất.',
    driftSignals: ['trở nên yếu đuối', 'bỏ qua bản năng', 'quan tâm quá nhiều đến quy tắc xã hội'],
  },
  {
    slug: 'quan_su_nghiem_khac',
    viLabel: 'Quân sự, nghiêm khắc',
    viDescription: 'Nhân vật mang phong cách quân nhân, kỷ luật sắt, trung thành với mệnh lệnh và tổ chức.',
    voiceHints: 'Giọng văn ngắn gọn, mệnh lệnh, tập trung vào chiến thuật và kỷ luật, ít cảm xúc cá nhân.',
    decisionStyle: 'Tuân thủ kỷ luật và mệnh lệnh, ưu tiên nhiệm vụ, hành động theo quy trình.',
    dialogueStyle: 'Nói ngắn gọn, rõ ràng, dùng thuật ngữ quân sự, giọng điệu nghiêm khắc.',
    conflictResponse: 'Triển khai chiến thuật, bảo vệ đồng đội, tấn công có tổ chức và kỷ luật.',
    driftSignals: ['bất tuân mệnh lệnh', 'hành động cá nhân', 'mất kỷ luật'],
  },
  {
    slug: 'thuong_nhan_xa_giao',
    viLabel: 'Thương nhân, xã giao',
    viDescription: 'Nhân vật khéo léo trong giao tiếp, am hiểu lợi ích, biết cách thương lượng và xây dựng quan hệ.',
    voiceHints: 'Giọng văn lịch sự, linh hoạt, biết cách nịnh hót và áp lực tinh thần, câu văn uyển chuyển.',
    decisionStyle: 'Đánh giá tình huống qua lợi ích quan hệ, tìm kiếm đôi bên cùng có lợi hoặc tối đa hóa lợi nhuận.',
    dialogueStyle: 'Nói chuyện lịch thiệp, hay dùng ẩn ý, biết lắng nghe và dẫn dắt cuộc trò chuyện.',
    conflictResponse: 'Đàm phán, dùng quan hệ và lợi ích để giải quyết, tránh đối đầu trực tiếp.',
    driftSignals: ['trở nên thẳng thắn quá mức', 'bỏ qua lợi ích quan hệ', 'không biết lắng nghe'],
  },
  {
    slug: 'dao_duc_cao_ca',
    viLabel: 'Đạo đức cao cả',
    viDescription: 'Nhân vật đại diện cho chính nghĩa tuyệt đối, luôn hành động vì lợi ích cộng đồng và không vị kỷ.',
    voiceHints: 'Giọng văn cao thượng, truyền cảm, mang tính cổ vũ và giáo huấn, câu văn trang trọng.',
    decisionStyle: 'Ưu tiên đạo đức và công lý, sẵn sàng hy sinh bản thân vì đại nghĩa.',
    dialogueStyle: 'Nói chuyện đầy lý tưởng, truyền cảm hứng, thường dùng từ ngữ cao đẹp và chính nghĩa.',
    conflictResponse: 'Đối mặt với cái ác không khoan nhượng, bảo vệ kẻ yếu, không thỏa hiệp với tội ác.',
    driftSignals: ['tha thứ tội ác không điều kiện', 'hành động vị kỷ', 'bỏ qua công lý'],
  },
  {
    slug: 'di_che_ham_muon',
    viLabel: 'Dị chế, ham muốn',
    viDescription: 'Nhân vật bị thúc đẩy bởi dục vọng và tham vọng, không ngại sử dụng mọi thủ đoạn để đạt được điều mình muốn.',
    voiceHints: 'Giọng văn cuốn hút, mê hoặc, mô tả ham muốn và dục vọng một cách mãnh liệt, câu văn đầy nhịp điệu.',
    decisionStyle: 'Theo đuổi mục tiêu một cách đam mê, sẵn sàng thao túng và lợi dụng người khác.',
    dialogueStyle: 'Nói chuyện quyến rũ, đầy ẩn ý, biết cách dụ dỗ và thuyết phục theo cách riêng.',
    conflictResponse: 'Dùng mọi thủ đoạn bao gồm quyến rũ, đe dọa và thao túng để chiến thắng.',
    driftSignals: ['từ bỏ ham muốn', 'trở nên vô cảm', 'hành động vô tư lợi'],
  },
  {
    slug: 'bi_quan_u_am',
    viLabel: 'Bi quan, u ám',
    viDescription: 'Nhân vật nhìn đời bi quan, luôn thấy mặt tối của sự việc, sống trong nỗi buồn và sự cô đơn.',
    voiceHints: 'Giọng văn u buồn, chậm rãi, nhiều hình ảnh màn đêm và sương mù, câu văn dài và thở dài.',
    decisionStyle: 'Dự đoán kết quả tiêu cực, thường từ bỏ trước khi thử, chuẩn bị cho điều tồi tệ nhất.',
    dialogueStyle: 'Nói chuyện u ám, hay than thở, sử dụng ngôn ngữ bi quan và tiêu cực.',
    conflictResponse: 'Chấp nhận thất bại, ít chống cự, hoặc phản ứng quyết liệt bất ngờ khi tuyệt vọng.',
    driftSignals: ['trở nên lạc quan đột ngột', 'hành động tích cực không căn cứ', 'mất đi chiều sâu bi quan'],
  },
  {
    slug: 'lac_quan_vo_tu',
    viLabel: 'Lạc quan, vô tư',
    viDescription: 'Nhân vật luôn nhìn mặt tích cực của cuộc sống, vô tư lự và không để tâm đến khó khăn.',
    voiceHints: 'Giọng văn tươi sáng, nhẹ nhàng, nhiều hình ảnh ánh sáng và màu sắc, câu văn ngắn và vui vẻ.',
    decisionStyle: 'Tin vào điều tốt đẹp, không lo lắng quá nhiều, chấp nhận mọi kết quả một cách bình thản.',
    dialogueStyle: 'Nói chuyện vui vẻ, hay đùa cợt, không bao giờ than phiền, giọng điệu nhẹ nhàng.',
    conflictResponse: 'Tìm kiếm điểm tích cực trong xung đột, hòa giải bằng sự vui vẻ và tha thứ.',
    driftSignals: ['trở nên bi quan', 'lo lắng quá mức', 'mất đi sự vô tư'],
  },
  {
    slug: 'tham_lam_vi_ki',
    viLabel: 'Tham lam, vị kỷ',
    viDescription: 'Nhân vật chỉ quan tâm đến lợi ích bản thân, tham lam và không ngại làm hại người khác để thỏa mãn dục vọng.',
    voiceHints: 'Giọng văn xấc xược, ích kỷ, mô tả mọi thứ qua lăng kính lợi ích cá nhân, câu văn thô và trực tiếp.',
    decisionStyle: 'Tối đa hóa lợi ích cá nhân, bất chấp hậu quả cho người khác, không tin tưởng ai.',
    dialogueStyle: 'Nói chuyện vị kỷ, hay than vãn về bản thân, đòi hỏi và đổ lỗi cho người khác.',
    conflictResponse: 'Bảo vệ lợi ích cá nhân một cách quyết liệt, phản bội nếu cần, không có lòng trung thành.',
    driftSignals: ['hành động vị tha', 'bỏ qua lợi ích cá nhân', 'trở nên tin tưởng người khác'],
  },
  {
    slug: 'trung_thanh_tuyet_doi',
    viLabel: 'Trung thành tuyệt đối',
    viDescription: 'Nhân vật trung thành đến mức mù quáng, sẵn sàng hy sinh mọi thứ vì người hoặc tổ chức mình phục vụ.',
    voiceHints: 'Giọng văn nhiệt thành, sùng bái, mô tả lòng trung thành như tôn giáo, câu văn đầy cảm xúc.',
    decisionStyle: 'Ưu tiên mệnh lệnh và lợi ích của đối tượng trung thành, bỏ qua lý trí cá nhân.',
    dialogueStyle: 'Nói chuyện đầy ngưỡng mộ, luôn bênh vực và ca ngợi đối tượng trung thành.',
    conflictResponse: 'Bảo vệ đối tượng trung thành bằng mọi giá, không nghe lý lẽ chống lại.',
    driftSignals: ['phản bội', 'đặt câu hỏi về lòng trung thành', 'hành động vì lợi ích cá nhân'],
  },
  {
    slug: 'tri_tue_sieu_viet',
    viLabel: 'Trí tuệ siêu việt',
    viDescription: 'Nhân vật thiên tài vượt trội, suy nghĩ nhanh và sâu hơn người thường, thường cô đơn vì không ai hiểu mình.',
    voiceHints: 'Giọng văn phức tạp, nhiều lớp nghĩa, mô tả suy luận nhanh và sâu, câu văn đầy ẩn dụ trí tuệ.',
    decisionStyle: 'Phân tích siêu việt, nhìn thấy kết quả nhiều bước trước, hành động dựa trên mô hình phức tạp.',
    dialogueStyle: 'Nói chuyện nhanh, nhiều tầng nghĩa, hay dùng phép ẩn dụ và ví dụ trừu tượng.',
    conflictResponse: 'Dùng trí tuệ để thao túng và dự đoán đối phương, giải quyết xung đột trước khi nổ ra.',
    driftSignals: ['mắc lỗi logic cơ bản', 'hành động ngu ngốc', 'không nhìn thấy hậu quả rõ ràng'],
  },
];
