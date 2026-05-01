import type { GenreFamily } from './genre-families.ts';

export type GenreSlug =
  | 'tien_hiep'
  | 'huyen_huyen'
  | 'vo_thuat'
  | 'cao_vo'
  | 'do_thi'
  | 'di_nang'
  | 'mat_the'
  | 'khoa_huyen'
  | 'kiem_hiep'
  | 'tu_chan'
  | 'di_gioi'
  | 'he_thong'
  | 'trong_sinh'
  | 'xuyen_khong'
  | 'lich_su_gia_tuong'
  | 'cung_dau'
  | 'linh_di'
  | 'trinh_tham'
  | 'quan_su'
  | 'dong_phuong_huyen_bi'
  | 'vong_du'
  | 'hac_am_fantasy'
  | 'do_thi_tu_tien'
  | 'do_thi_di_nang'
  | 'tuy_chon';

export interface GenreDef {
  slug: GenreSlug;
  viLabel: string;
  viDescription: string;
  family: GenreFamily;
  allowedTropes: string[];
  discouragedTropes: string[];
  toneGuidance: string;
  worldbuildingGuidance: string;
  examplePremises: string[];
}

export const GENRES: readonly GenreDef[] = [
  {
    slug: 'tien_hiep',
    viLabel: 'Tiên hiệp',
    viDescription: 'Thể loại tu tiên truyền thống, nhân vật chính theo đuổi đại đạo, trải qua các cảnh giới tiên ma, phi thăng và tranh đấu giữa các phái tu chân.',
    family: 'cultivation',
    allowedTropes: ['tông môn đấu tranh', 'bí cảnh thăm dò', 'luyện đan luyện khí', 'phi thăng'],
    discouragedTropes: ['vô căn cứ hạ thế', 'nhân vật phản diện ngốc nghếch', 'kim chỉ nam vô hạn'],
    toneGuidance: 'Nên giữ sự hùng vĩ và trang nghiêm, tôn trọng quy luật tu chân, tránh hài hước quá mức làm mất đi khí chất tiên hiệp.',
    worldbuildingGuidance: 'Cần xây dựng hệ thống cảnh giới rõ ràng, các tông môn có văn hóa và lịch sử riêng, thế giới rộng lớn với nhiều đại lục.',
    examplePremises: ['Một tán tu vô danh tìm được di thư tiên cổ và bước vào con đường tranh bá tiên giới.', 'Đệ tử ngoại môn của đại tông môn bị ruồng bỏ nhưng ẩn giấu huyết mạch thần thánh.'],
  },
  {
    slug: 'huyen_huyen',
    viLabel: 'Huyền huyễn',
    viDescription: 'Thể loại kết hợp nhiều yếu tố kỳ ảo, có thể bao gồm ma pháp, dị chủng, thần thoại và thế giới giả tưởng rộng lớn không giới hạn ở tu chân.',
    family: 'mixed',
    allowedTropes: ['ma pháp hệ thống', 'chủng tộc dị giới', 'thần thoại cổ xưa', 'bảo vật huyền bí'],
    discouragedTropes: ['logic nội tại mâu thuẫn', 'cường hóa vô lý qua đêm', 'phản diện chỉ để làm nền'],
    toneGuidance: 'Tùy chỉnh linh hoạt giữa sự kỳ ảo và logic nội tại, có thể hùng vĩ hoặc u ám tùy bối cảnh.',
    worldbuildingGuidance: 'Thế giới cần có quy tắc ma pháp hoặc năng lượng riêng, đa dạng chủng tộc và địa hình, lịch sử thần thoại phong phú.',
    examplePremises: ['Một ma pháp sư trẻ khám phá ra thân thế của mình liên quan đến một vị cổ thần đã ngủ say.', 'Thế giới bị chia cắt bởi bốn đại nguyên tố, nhân vật chính mang trong mình sức mạnh của nguyên tố thứ năm.'],
  },
  {
    slug: 'vo_thuat',
    viLabel: 'Võ thuật',
    viDescription: 'Thể loại tập trung vào võ công, võ lâm giang hồ, các phái võ thuật tranh đấu và chính nghĩa giang hồ, thường diễn ra trong bối cảnh cổ đại.',
    family: 'martial',
    allowedTropes: ['võ lâm đại hội', 'môn phái tranh đấu', 'bí tịch võ công', 'giang hồ hào hiệp'],
    discouragedTropes: ['võ công vô địch quá sớm', 'môn phái không có đặc sắc', 'kết thúc cẩu huyết'],
    toneGuidance: 'Nên giữ tinh thần hào hiệp và võ đạo, tôn trọng chữ tín và chính nghĩa trong võ lâm.',
    worldbuildingGuidance: 'Cần xây dựng các môn phái võ thuật với võ công đặc trưng, giang hồ đầy ân oán và quy tắc ứng xử riêng.',
    examplePremises: ['Một thiếu niên mồ côi được một lão giang hồ truyền dạy võ công tuyệt thế để báo thù cho gia tộc.', 'Hai đại phái võ lâm tranh đấu suốt trăm năm, nhân vật chính phát hiện ra âm mưu thao túng từ thế lực thứ ba.'],
  },
  {
    slug: 'cao_vo',
    viLabel: 'Cao võ',
    viDescription: 'Thể loại võ thuật cấp cao, nhân vật chính đạt đến cảnh giới võ đạo đỉnh cao, có thể phá vỡ giới hạn thể xác, gần với tiên hiệp nhưng không tu chân.',
    family: 'martial',
    allowedTropes: ['phá vỡ hư không', 'võ đạo chí tôn', 'cảnh giới võ thuật', 'huyết mạch chiến đấu'],
    discouragedTropes: ['lặp lại võ công', 'thiếu chiến thuật', 'đối thủ không tăng trưởng'],
    toneGuidance: 'Tập trung vào sự mạnh mẽ của thể xác và ý chí chiến đấu, hùng vĩ nhưng không mất đi tính người.',
    worldbuildingGuidance: 'Thế giới cần có hệ thống cảnh giới võ thuật rõ ràng, các cường giả có ảnh hưởng lớn đến thế cục.',
    examplePremises: ['Một võ giả từ tầng thấp nhất của võ đạo vượt qua từng cảnh giới để đạt đến truyền thuyết.', 'Trong thế giới võ đạo suy tàn, nhân vật chính khôi phục lại con đường võ cực đã thất truyền.'],
  },
  {
    slug: 'do_thi',
    viLabel: 'Đô thị',
    viDescription: 'Thể loại diễn ra trong bối cảnh thành thị hiện đại, xoay quanh cuộc sống đô thị, các thế lực xã hội, tình yêu và sự nghiệp trong thành phố phồn hoa.',
    family: 'urban',
    allowedTropes: ['tổng tài bá đạo', 'tiểu bạch thoại', 'trùng sinh đô thị', 'gả vào hào môn'],
    discouragedTropes: ['logic kinh tế phi thực tế', 'quá nhiều ngẫu nhiên may mắn', 'tình tiết ngược tâm không căn cứ'],
    toneGuidance: 'Có thể nhẹ nhàng hoặc kịch tính nhưng cần giữ sát với thực tế đô thị, tránh quá phi thực tế.',
    worldbuildingGuidance: 'Thành phố cần có khí chất riêng, các tập đoàn và gia tộc có cấu trúc quyền lực rõ ràng.',
    examplePremises: ['Một chàng trai nghèo từ nông thôn lên thành phố khởi nghiệp và đối đầu với các thế lực tài phiệt.', 'Một nữ luật sư trẻ vô tình phát hiện âm mưu thâu tóm thành phố của một tập đoàn ngầm.'],
  },
  {
    slug: 'di_nang',
    viLabel: 'Dị năng',
    viDescription: 'Thể loại về những người sở hữu năng lực đặc biệt vượt qua giới hạn con người thông thường, thường kết hợp yếu tố hành động và khoa học viễn tưởng.',
    family: 'ability',
    allowedTropes: ['đánh thức dị năng', 'tổ chức siêu năng lực', 'dị năng tiến hóa', 'đối đầu quái vật'],
    discouragedTropes: ['dị năng quá mạnh không giới hạn', 'thiếu giải thích nguồn gốc', 'cốt truyện đơn điệu'],
    toneGuidance: 'Có thể kịch tính và nhanh nhẹn, cần giữ sự cân bằng giữa sức mạnh dị năng và yếu tố con người.',
    worldbuildingGuidance: 'Cần giải thích cơ chế dị năng, tổ chức quản lý hoặc săn lùng dị năng giả, xã hội phản ứng với dị năng.',
    examplePremises: ['Một học sinh trung học đột nhiên đánh thức dị năng thời gian và bị cuốn vào cuộc chiến của các tổ chức bí mật.', 'Trong thế giới nơi dị năng là hàng hóa, một người vô năng phát hiện ra khả năng vô hiệu hóa mọi siêu năng lực.'],
  },
  {
    slug: 'mat_the',
    viLabel: 'Mạt thế',
    viDescription: 'Thể loại thế giới sau ngày tận thế, xã hội sụp đổ, nhân loại đấu tranh sinh tồn trước dịch bệnh, thiên tai hoặc xâm lăng, đầy tuyệt vọng và hy vọng.',
    family: 'horror',
    allowedTropes: ['sinh tồn hoang dã', 'căn cứ phòng thủ', 'dị chủng xâm lăng', 'tài nguyên khan hiếm'],
    discouragedTropes: ['vũ khí vô hạn', 'nhân vật không bao giờ mệt', 'thiếu hậu quả cho quyết định'],
    toneGuidance: 'Nên giữ sự căng thẳng và tuyệt vọng xen lẫn hy vọng, mỗi quyết định đều có giá phải trả.',
    worldbuildingGuidance: 'Thế giới cần thể hiện sự hoang tàn rõ rệt, các phe phái sinh tồn với quy tắc riêng, nguy hiểm luôn rình rập.',
    examplePremises: ['Sau đại dịch zombie, một nhóm người sống sót tìm đến thánh địa được đồn đại là nơi an toàn cuối cùng.', 'Trái đất bị người ngoài hành tinh xâm chiếm, nhân vật chính dẫn dắt cuộc kháng chiến dưới lòng đất.'],
  },
  {
    slug: 'khoa_huyen',
    viLabel: 'Khoa huyễn',
    viDescription: 'Thể loại khoa học viễn tưởng kết hợp huyễn huyễn, công nghệ tương lai và năng lượng huyền bí, tạo nên thế giới nơi khoa học và ma pháp cùng tồn tại.',
    family: 'tech',
    allowedTropes: ['công nghệ cổ đại', 'năng lượng huyền bí', 'cơ giáp ma pháp', 'tinh tế văn minh'],
    discouragedTropes: ['khoa học giải thích quá đà', 'thiếu quy tắc cho huyễn huyễn', 'công nghệ vô hạn mà không có giá'],
    toneGuidance: 'Cân bằng giữa lý trí khoa học và sự huyền bí, tạo không khí khám phá và kinh ngạc.',
    worldbuildingGuidance: 'Thế giới cần có hệ thống công nghệ rõ ràng, nguồn năng lượng đặc biệt, và sự tương tác giữa khoa học với huyễn huyễn.',
    examplePremises: ['Một kỹ sư vũ trụ phát hiện ra di sản của nền văn minh kết hợp khoa học và ma pháp.', 'Trong tương lai xa, con người sử dụng công nghệ để mô phỏng và kiểm soát các hiện tượng siêu nhiên.'],
  },
  {
    slug: 'kiem_hiep',
    viLabel: 'Kiếm hiệp',
    viDescription: 'Thể loại võ hiệp lấy kiếm làm trung tâm, nhân vật chính thường là kiếm khách, đề cao tinh thần kiếm đạo và tự do giang hồ.',
    family: 'martial',
    allowedTropes: ['kiếm đạo chí cao', 'kiếm khách lang bạt', 'bí kiếm thất truyền', 'quyết đấu trên đỉnh núi'],
    discouragedTropes: ['kiếm pháp vô địch quá nhanh', 'thiếu tín ngưỡng kiếm đạo', 'đối thủ yếu đuối'],
    toneGuidance: 'Tôn vinh sự thanh cao và cô độc của kiếm khách, giữ tinh thần tự do và bất khuất.',
    worldbuildingGuidance: 'Thế giới giang hồ cần có nhiều kiếm phái, các truyền thuyết về thần kiếm, và văn hóa rượu kiếm.',
    examplePremises: ['Một kiếm khách mất trí nhớ chỉ nhớ mỗi một chiêu kiếm, nhưng chiêu ấy lại là tuyệt học thiên hạ.', 'Thế hệ kiếm tu suy tàn, nhân vật chính quyết tâm khôi phục lại vinh quang của kiếm đạo.'],
  },
  {
    slug: 'tu_chan',
    viLabel: 'Tu chân',
    viDescription: 'Thể loại tu tiên chú trọng vào quá trình tu luyện bản thân, tâm tính và đạo pháp, ít đao kiếm hơn tiên hiệp và chú trọng nội tâm.',
    family: 'cultivation',
    allowedTropes: ['tâm ma khảo nghiệm', 'đạo pháp tự nhiên', 'tĩnh tu ẩn cư', 'ngộ đạo đột phá'],
    discouragedTropes: ['giết chóc vô cớ', 'tâm tính thay đổi đột ngột', 'thiếu triết lý tu chân'],
    toneGuidance: 'Trầm lặng và sâu sắc, chú trọng nội tâm và triết lý, có thể kết hợp hành động nhưng không thô bạo.',
    worldbuildingGuidance: 'Cần xây dựng các pháp môn tu chân với triết lý riêng, địa điểm tu luyện linh thiêng, và quy luật thiên đạo.',
    examplePremises: ['Một tu sĩ trẻ bị trục xuất khỏi tông môn nhưng lại ngộ ra chân lý tu chân trong phàm trần.', 'Hai đạo phái đối lập về quan điểm tu chân, nhân vật chính tìm ra con đường thứ ba.'],
  },
  {
    slug: 'di_gioi',
    viLabel: 'Dị giới',
    viDescription: 'Thể loại nhân vật chính xuyên không sang thế giới khác, thường có hệ thống ma pháp, chủng tộc khác nhau và quy tắc vật lý khác biệt.',
    family: 'mixed',
    allowedTropes: ['xuyên không dị giới', 'hệ thống ma pháp', 'chinh phục chủng tộc', 'xây dựng thế lực'],
    discouragedTropes: ['quá dựa dẫm vào kiến thức cũ', 'thiếu khó khăn khi thích nghi', 'chủng tộc đơn điệu'],
    toneGuidance: 'Tập trung vào sự khám phá và thích nghi, giữ tinh thần phiêu lưu và tò mò.',
    worldbuildingGuidance: 'Thế giới dị giới cần có hệ thống quy tắc riêng, đa dạng sinh vật và văn minh, bản đồ rộng lớn.',
    examplePremises: ['Một game thủ bị kéo vào thế giới game yêu thích nhưng mọi quy tắc đều đã thay đổi.', 'Một nhà khoa học xuyên không đến thế giới ma pháp và cố gắng dùng khoa học giải thích ma pháp.'],
  },
  {
    slug: 'he_thong',
    viLabel: 'Hệ thống',
    viDescription: 'Thể loại nhân vật chính sở hữu hệ thống hỗ trợ, thường có nhiệm vụ, phần thưởng và cường hóa theo cấp độ, tạo cảm giác tiến bộ rõ ràng.',
    family: 'system',
    allowedTropes: ['hệ thống nhiệm vụ', 'cấp độ và kỹ năng', 'cửa hàng hệ thống', 'nhiệm vụ ẩn'],
    discouragedTropes: ['hệ thống quá mạnh không giới hạn', 'thiếu rủi ro', 'phần thưởng không cân xứng'],
    toneGuidance: 'Có thể kịch tính hoặc giải trí, cần giữ sự cân bằng giữa hệ thống và quyết định của nhân vật.',
    worldbuildingGuidance: 'Hệ thống cần có quy tắc rõ ràng, nguồn gốc có thể giải thích được, và giới hạn để tạo căng thẳng.',
    examplePremises: ['Một người bình thường đột nhiên kích hoạt hệ thống sinh tồn trong thế giới nguy hiểm.', 'Hệ thống của nhân vật chính bị lỗi và biến thành phiên bản nguy hiểm nhưng mạnh mẽ hơn.'],
  },
  {
    slug: 'trong_sinh',
    viLabel: 'Trọng sinh',
    viDescription: 'Thể loại nhân vật chính chết đi và sống lại, thường mang theo ký ức kiếp trước để thay đổi vận mệnh, sửa chữa lỗi lầm hoặc báo thù.',
    family: 'reincarnation',
    allowedTropes: ['trọng sinh báo thù', 'thay đổi vận mệnh', 'lợi thế kiếp trước', 'đối mặt kẻ thù cũ'],
    discouragedTropes: ['quá dễ dàng nhờ kiếp trước', 'không có hậu quả cho thay đổi', 'nhân vật phẳng lì'],
    toneGuidance: 'Có thể hận thù hoặc giải thoát, cần thể hiện sự trưởng thành qua hai kiếp sống.',
    worldbuildingGuidance: 'Thế giới cần có cơ chế luân hồi hoặc thời gian cho phép trọng sinh, và sự thay đổi do can thiệp kiếp trước.',
    examplePremises: ['Một đại tông sư bị phản bội chết đi, trọng sinh về thời niên thiếu và quyết tâm thay đổi vận mệnh.', 'Một nữ tướng quân trọng sinh thành tiểu thư yếu đuối, dùng kinh nghiệm chiến trường để thống lĩnh hậu cung.'],
  },
  {
    slug: 'xuyen_khong',
    viLabel: 'Xuyên không',
    viDescription: 'Thể loại nhân vật chính xuyên qua thời không đến thời đại khác, có thể là cổ đại, tương lai hoặc thế giới song song.',
    family: 'reincarnation',
    allowedTropes: ['xuyên không cổ đại', 'thay đổi lịch sử', 'kiến thức hiện đại', 'văn hóa xung đột'],
    discouragedTropes: ['thay đổi lịch sử quá dễ', 'thiếu hậu quả văn hóa', 'ngôn ngữ không rào cản'],
    toneGuidance: 'Tập trung vào sự xung đột văn hóa và thích nghi, có thể hài hước hoặc nghiêm túc.',
    worldbuildingGuidance: 'Thời đại đích cần được nghiên cứu kỹ, các khác biệt văn hóa và công nghệ là điểm nhấn.',
    examplePremises: ['Một bác sĩ hiện đại xuyên không về triều đại phong kiến và dùng y thuật cứu người.', 'Một sinh viên lịch sử xuyên không đến thời loạn thế và cố gắng thống nhất thiên hạ.'],
  },
  {
    slug: 'lich_su_gia_tuong',
    viLabel: 'Lịch sử giả tưởng',
    viDescription: 'Thể loại dựa trên lịch sử thật nhưng có yếu tố hư cấu, nhân vật và sự kiện có thể thay đổi nhưng vẫn giữ bối cảnh lịch sử.',
    family: 'historical',
    allowedTropes: ['thay đổi lịch sử', 'nhân vật lịch sử', 'triều đình đấu đá', 'chiến tranh cổ đại'],
    discouragedTropes: ['bóp méo lịch sử quá đà', 'thiếu nghiên cứu thời đại', 'công nghệ xuyên không không giải thích'],
    toneGuidance: 'Nghiêm túc và trang trọng, tôn trọng tinh thần thời đại nhưng cho phép sáng tạo trong khuôn khổ.',
    worldbuildingGuidance: 'Cần nghiên cứu kỹ lưỡng về chính trị, văn hóa và xã hội thời đại được chọn.',
    examplePremises: ['Một mưu thần xuất hiện trong thời loạn thế Tam Quốc và thay đổi cục diện thiên hạ.', 'Một hoàng đế trẻ trong triều đại suy yếu dùng cải cách hiện đại để cứu vãn giang sơn.'],
  },
  {
    slug: 'cung_dau',
    viLabel: 'Cung đấu',
    viDescription: 'Thể loại đấu tranh trong hoàng cung, hậu cung, đề cao mưu kế, âm mưu và quyền lực giữa các phi tần, hoàng tử và thế lực triều đình.',
    family: 'historical',
    allowedTropes: ['hậu cung tranh sủng', 'mưu kế âm thầm', 'phi tần thăng tiến', 'thái tử chi tranh'],
    discouragedTropes: ['mưu kế quá đơn giản', 'nhân vật đơn thuần tốt hoặc xấu', 'thiếu hậu quả chính trị'],
    toneGuidance: 'U ám và tinh vi, mỗi lời nói đều ẩn ý, mỗi hành động đều có động cơ sâu xa.',
    worldbuildingGuidance: 'Hoàng cung cần có cấu trúc quyền lực phức tạp, các phe phái rõ ràng, và quy tắc lễ nghi nghiêm ngặt.',
    examplePremises: ['Một cung nữ nhỏ bé dùng trí tuệ và sắc đẹp để leo lên đỉnh cao quyền lực hậu cung.', 'Hoàng đế băng hà, các hoàng tử tranh giành ngôi vị và thế lực ngoại thích xen vào.'],
  },
  {
    slug: 'linh_di',
    viLabel: 'Linh dị',
    viDescription: 'Thể loại kinh dị tâm lý và siêu nhiên, xoay quanh các hiện tượng ma quái, lời nguyền và sự sợ hãi từ những điều không giải thích được.',
    family: 'horror',
    allowedTropes: ['ma quái ám ảnh', 'lời nguyền cổ xưa', 'sợ hãi tâm lý', 'bí ẩn chết chóc'],
    discouragedTropes: ['ma quái quá yếu', 'giải thích quá sớm', 'thiếu không khí căng thẳng'],
    toneGuidance: 'U ám và bí ẩn, giữ sự sợ hãi trong tâm trí độc giả, không nên giải thích quá nhiều.',
    worldbuildingGuidance: 'Cần tạo ra các địa điểm ám ảnh, truyền thuyết đô thị hoặc làng quê, và quy tắc của thế giới ngầm.',
    examplePremises: ['Một thị trấn nhỏ bị ám bởi lời nguyền tái diễn mỗi thế hệ, nhân vật chính tìm cách phá giải.', 'Một người có khả năng nhìn thấy linh hồn bị cuốn vào vụ án ma quái hàng loạt.'],
  },
  {
    slug: 'trinh_tham',
    viLabel: 'Trinh thám',
    viDescription: 'Thể loại điều tra phá án, nhân vật chính là thám tử hoặc người có khả năng suy luận, giải mã các bí ẩn và tội ác phức tạp.',
    family: 'mystery',
    allowedTropes: ['vụ án hóc búa', 'manh mối ẩn giấu', 'thám tử lập dị', 'tội phạm thông minh'],
    discouragedTropes: ['manh mối không rõ ràng', 'kết thúc gượng ép', 'thám tử đoán đúng không căn cứ'],
    toneGuidance: 'Căng thẳng và trí tuệ, giữ sự logic trong suy luận, tôn trọng trí thông minh của độc giả.',
    worldbuildingGuidance: 'Bối cảnh điều tra cần có chi tiết thực tế, hệ thống pháp luật rõ ràng, và các nhân vật có động cơ phức tạp.',
    examplePremises: ['Một thám tử tư nhân nhận vụ án tưởng chừng đơn giản nhưng dẫn đến âm mưu toàn cầu.', 'Trong một làng quê cô lập, một loạt án mạng xảy ra theo mô típ cổ tích địa phương.'],
  },
  {
    slug: 'quan_su',
    viLabel: 'Quân sự',
    viDescription: 'Thể loại chiến tranh và quân sự, tập trung vào chiến thuật, chiến lược, lòng trung thành và tàn khốc của chiến trường.',
    family: 'historical',
    allowedTropes: ['chiến trường ác liệt', 'mưu lược quân sự', 'tình đồng đội', 'phản bội và trung thành'],
    discouragedTropes: ['chiến tranh không hậu quả', 'tướng lĩnh bất tử', 'thiếu chiến thuật cụ thể'],
    toneGuidance: 'Hùng tráng và bi tráng, thể hiện tàn khốc của chiến tranh nhưng cũng vinh quang của anh hùng.',
    worldbuildingGuidance: 'Cần xây dựng các thế lực quân sự, địa hình chiến trường, hậu cần và chính trị ngoại giao.',
    examplePremises: ['Một binh lính bình thường từng bước trở thành đại tướng quân trong thời loạn thế.', 'Hai quốc gia đại chiến suốt thập kỷ, nhân vật chính là gián điệp hai mang giữa hai phe.'],
  },
  {
    slug: 'dong_phuong_huyen_bi',
    viLabel: 'Đông phương huyền bí',
    viDescription: 'Thể loại huyền huyễn mang đậm văn hóa Đông phương, kết hợp yếu tố Phật giáo, Đạo giáo, phong thủy và truyền thuyết châu Á.',
    family: 'mixed',
    allowedTropes: ['Phật Đạo tranh phong', 'phong thủy mệnh lý', 'yêu ma quỷ quái', 'bí thuật cổ truyền'],
    discouragedTropes: ['sao chép văn hóa nông cạn', 'thiếu nghiên cứu tôn giáo', 'huyền bí không có quy tắc'],
    toneGuidance: 'Trang nghiêm và huyền bí, tôn trọng văn hóa tâm linh Đông phương, giữ sự kính sợ trước siêu nhiên.',
    worldbuildingGuidance: 'Thế giới cần kết hợp sâu sắc các yếu tố văn hóa Á Đông, tôn giáo, phong tục và truyền thuyết địa phương.',
    examplePremises: ['Một pháp sư trẻ tu luyện cả Phật pháp và Đạo thuật để đối đầu với một cổ ma sắp thức tỉnh.', 'Trong thành phố hiện đại, một gia tộc phong thủy thần bí bảo vệ long mạch của đất nước.'],
  },
  {
    slug: 'vong_du',
    viLabel: 'Võng du',
    viDescription: 'Thể loại thế giới game online, nhân vật chính sống trong hoặc bị mắc kẹt trong trò chơi điện tử, kết hợp yếu tố công nghệ và phiêu lưu.',
    family: 'tech',
    allowedTropes: ['game thủ bá đạo', 'thế giới game thực', 'công hội chiến', 'boss thế giới'],
    discouragedTropes: ['game không có quy tắc', 'dễ dàng vô địch', 'thiếu tương tác xã hội'],
    toneGuidance: 'Năng động và cạnh tranh, giữ sự hồi hộp của game nhưng không quên thế giới thực bên ngoài.',
    worldbuildingGuidance: 'Thế giới game cần có hệ thống nghề nghiệp, bản đồ, quái vật và cơ chế cân bằng rõ ràng.',
    examplePremises: ['Một game thủ chuyên nghiệp phát hiện ra trò chơi thực sự ảnh hưởng đến thế giới thực.', 'Toàn bộ nhân loại bị chuyển ý thức vào game sinh tồn và phải vượt qua các thử thách để sống sót.'],
  },
  {
    slug: 'hac_am_fantasy',
    viLabel: 'Hắc ám fantasy',
    viDescription: 'Thể loại fantasy với góc nhìn u tối, nhân vật chính thường là phản diện hoặc sống trong thế giới đầy bạo lực và đạo đức xám.',
    family: 'mixed',
    allowedTropes: ['phản anh hùng', 'thế giới tàn khốc', 'đạo đức xám', 'quyền lực tuyệt đối'],
    discouragedTropes: ['bạo lực không mục đích', 'thiếu động cơ nhân vật', 'tuyệt vọng hoàn toàn không hy vọng'],
    toneGuidance: 'U ám nhưng không hoàn toàn tuyệt vọng, nhân vật có động cơ phức tạp và thế giới khắc nghiệt.',
    worldbuildingGuidance: 'Thế giới cần thể hiện sự tàn khốc rõ nét, các thế lực đen tối có cấu trúc, và luật rừng chi phối.',
    examplePremises: ['Một hiệp sĩ bị phản bội bởi vương quốc mình bảo vệ, trở thành lãnh chúa hắc ám báo thù.', 'Trong thế giới nơi thiện ác không rõ ràng, một sát thủ nhận nhiệm vụ ám sát vị thần duy nhất còn lại.'],
  },
  {
    slug: 'do_thi_tu_tien',
    viLabel: 'Đô thị tu tiên',
    viDescription: 'Thể loại tu tiên diễn ra trong bối cảnh thành thị hiện đại, kết hợp tu chân truyền thống với cuộc sống đô thị và công nghệ.',
    family: 'urban',
    allowedTropes: ['tu chân giữa phố thị', 'linh khí hiện đại', 'tông môn ngầm', 'pháp bảo công nghệ'],
    discouragedTropes: ['thiếu xung đột thành thị', 'tu chân quá dễ', 'đô thị chỉ làm nền'],
    toneGuidance: 'Kết hợp giữa sự tĩnh lặng tu chân và nhịp sống hối hả đô thị, tạo nên sự tương phản thú vị.',
    worldbuildingGuidance: 'Thành phố cần có các điểm linh mạch ẩn, tông môn ngầm hoạt động trong xã hội hiện đại.',
    examplePremises: ['Một tu sĩ trẻ từ núi cao xuống thành phố tu luyện và phát hiện linh khí nơi đây dồi dào bất ngờ.', 'Một doanh nhân thành đạt thực chất là trưởng lão của một tông môn tu chân ngầm khống chế kinh tế thành phố.'],
  },
  {
    slug: 'do_thi_di_nang',
    viLabel: 'Đô thị dị năng',
    viDescription: 'Thể loại dị năng trong bối cảnh đô thị hiện đại, các siêu năng lực tồn tại song song với cuộc sống thường nhật và các thế lực ngầm.',
    family: 'ability',
    allowedTropes: ['dị năng giấu mặt', 'tổ chức ngầm', 'đô thị ám ảnh', 'siêu năng lực giới hạn'],
    discouragedTropes: ['dị năng quá phổ biến', 'thiếu hệ thống giám sát', 'đô thị không phản ứng với dị năng'],
    toneGuidance: 'Kịch tính và bí ẩn, giữ sự căng thẳng giữa thế giới bình thường và thế giới dị năng.',
    worldbuildingGuidance: 'Cần xây dựng các tổ chức dị năng ngầm, hệ thống kiểm soát, và cách xã hội che giấu sự tồn tại của dị năng.',
    examplePremises: ['Một nhân viên văn phòng bình thường phát hiện mình có dị năng và bị cuốn vào chiến tranh ngầm của các tổ chức.', 'Trong thành phố nơi dị năng bị cấm, một nhóm người bí mật tập hợp để bảo vệ những người mới đánh thức năng lực.'],
  },
  {
    slug: 'tuy_chon',
    viLabel: 'Tùy chọn',
    viDescription: 'Thể loại do người dùng tự định nghĩa, không thuộc danh mục có sẵn. Được sử dụng khi câu chuyện không phù hợp với bất kỳ thể loại nào trong catalog.',
    family: 'none',
    allowedTropes: [],
    discouragedTropes: [],
    toneGuidance: 'Không có hướng dẫn cố định, phụ thuộc hoàn toàn vào mô tả tùy chỉnh của người dùng.',
    worldbuildingGuidance: 'Không có hướng dẫn cố định, phụ thuộc hoàn toàn vào mô tả tùy chỉnh của người dùng.',
    examplePremises: [],
  },
];
