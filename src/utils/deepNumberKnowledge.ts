// src/utils/deepNumberKnowledge.ts

export interface NumberProfile {
  number: number | string;
  name: string;
  planet: string;
  keywords: string[];
  advantages: string;
  challenges: string;
  balance: string;
  careerSuggestions: string;
  coreMessage?: string; // câu tóm tắt 1 dòng
}

export const deepNumberKnowledge: Record<string, NumberProfile> = {
  "1": {
    number: 1,
    name: "THỦ LĨNH - MẶT TRỜI",
    planet: "MẶT TRỜI",
    keywords: [
      "Lãnh đạo",
      "Tiên phong",
      "Tầm nhìn",
      "Tự chủ",
      "Độc lập",
      "Quyết đoán",
      "Sáng tạo",
      "Trách nhiệm"
    ],
    advantages: 
      "Dẫn dắt, tiên phong\n" +
      "Mạnh mẽ, tự tin, năng nổ\n" +
      "Độc lập, sáng tạo, nhiều sáng kiến\n" +
      "Khác biệt\n" +
      "Quyết tâm\n" +
      "Trách nhiệm, mục tiêu\n" +
      "Tầm ảnh hưởng\n" +
      "Mang tính cách của tất cả các con số còn lại",
    challenges: 
      "Thiếu kiên nhẫn, thiếu khoan dung\n" +
      "Cái tôi cao, bảo thủ\n" +
      "Áp đặt, bất cần, sai khiến\n" +
      "Không nghe người khác, không thích bị sai khiến\n" +
      "Tự trọng cao, thích tranh đua\n" +
      "Nóng tính, độc đoán, hung hăng\n" +
      "Mục tiêu quá, không quan tâm cảm xúc người khác\n" +
      "Khi đạt được mục tiêu rồi nhanh chán, chăm sóc không tốt dẫn đến thiếu lòng biết ơn\n" +
      "Khó hòa đồng\n" +
      "Cầu toàn quá, thiếu tự tin",
    balance: 
      "Học cách lắng nghe, bớt cầu toàn, mở lòng\n" +
      "Nói ra điều mình muốn\n" +
      "Chấp nhận sự khác biệt của người khác\n" +
      "Bớt tạo áp lực cho mình\n" +
      "Mềm mỏng hơn, hòa đồng hơn, hạ cái tôi\n" +
      "Thấu hiểu, yêu thương\n" +
      "Khiêm hạ",
    careerSuggestions: 
      "Công việc cho mình quyền tự chủ và ra quyết định\n" +
      "Công việc cho mình cơ hội thành người dẫn đầu\n" +
      "Công việc có yếu tố sáng tạo mới mẻ, mở đường\n" +
      "Tự mình làm chủ, lãnh đạo, quản lý",
    coreMessage: "Bạn sinh ra để dẫn dắt và khai phá con đường mới."
  },

  "2": {
    number: 2,
    name: "YÊU THƯƠNG - MẶT TRĂNG",
    planet: "MẶT TRĂNG",
    keywords: [
      "Hòa bình",
      "Hòa hợp",
      "Nhạy cảm",
      "Trực giác",
      "Quan tâm",
      "Thấu hiểu",
      "Yêu thương",
      "Dịu dàng"
    ],
    advantages: 
      "Hòa hợp, hòa giải, nhẹ nhàng, hòa đồng\n" +
      "Kết nối, hợp tác\n" +
      "Khiêm nhường, khiêm tốn\n" +
      "Kiên nhẫn\n" +
      "Trực giác nhạy bén\n" +
      "Chia sẻ và thích được chia sẻ\n" +
      "Nhà ngoại giao\n" +
      "Thích làm việc nhóm\n" +
      "Giàu tình yêu thương\n" +
      "Hay giúp đỡ\n" +
      "Biết cảm thông",
    challenges: 
      "Dao động\n" +
      "Cả nể, tính chủ kiến chưa cao\n" +
      "Dễ tổn thương do nhạy cảm quá\n" +
      "Đòi được yêu thương, hay tâm sự, buôn chuyện\n" +
      "Dễ tụt cảm xúc, ủy mị\n" +
      "Nhút nhát, thiếu tự tin\n" +
      "Thiếu tính chủ động\n" +
      "Lập trường không vững vàng\n" +
      "Sĩ tình, đa sầu, đa cảm\n" +
      "Nhịn, nén nỗi đau bên trong\n" +
      "Hay ghen tị, thiếu quyết đoán",
    balance: 
      "Quyết đoán hơn, thực tế hơn\n" +
      "Chọn lọc hơn\n" +
      "Chủ kiến hơn\n" +
      "Lý trí hơn\n" +
      "Biết cách từ chối\n" +
      "Cân bằng cảm xúc, luôn hướng về mặt tích cực\n" +
      "Yêu thương đúng cách\n" +
      "Có mục tiêu, kiên nhẫn",
    careerSuggestions: 
      "Môi trường làm việc có đội nhóm\n" +
      "Công việc có yếu tố giáo dục\n" +
      "Các dịch vụ chăm sóc, nuôi dưỡng\n" +
      "Công việc tư vấn, coaching về phát triển bản thân, tâm linh",
    coreMessage: "Bạn sinh ra để kết nối, yêu thương và mang lại sự hòa hợp cho mọi người xung quanh."
  },

  "3": {
    number: 3,
    name: "NGƯỜI TRUYỀN CẢM HỨNG - SAO MỘC",
    planet: "SAO MỘC",
    keywords: [
      "Sáng tạo",
      "Tự do",
      "Hào phóng",
      "Vui tươi",
      "Lạc quan",
      "Lôi cuốn",
      "Dí dỏm",
      "Giàu cảm xúc"
    ],
    advantages: 
      "Năng lượng, kết nối tốt\n" +
      "Trí tuệ, tầm nhìn xa\n" +
      "Vui vẻ, hài hước, vô tư, lạc quan, tự do\n" +
      "Nghệ thuật, thích cái đẹp, lãng mạn\n" +
      "Tưởng tượng tốt\n" +
      "Sáng tạo, ý tưởng\n" +
      "Dễ thích nghi, thân thiện\n" +
      "Thích cái mới, nói chuyện lôi cuốn\n" +
      "Năng động\n" +
      "Hoạt ngôn",
    challenges: 
      "Không có môi trường để nói thì thiếu tự tin\n" +
      "Thiếu kỷ luật, tập trung, thực tế, hay ngẫu hứng, không nhất quán\n" +
      "Thất thường về cảm xúc, bất cần, đa mục tiêu, suy nghĩ rời rạc, không sâu sắc\n" +
      "Dễ thay đổi, mau chán\n" +
      "Thiếu lập trường, thiếu quyết đoán, hay chỉ trích, hay ghen tị\n" +
      "Hay nói xàm, nói móc, không quan tâm cảm xúc người khác\n" +
      "Khó giữ bí mật, lười hứa, không sâu sắc, hay quên\n" +
      "Hướng ra ngoài nhiều quá\n" +
      "Thích buôn chuyện, dễ bị tác động bởi người khác, hoang phí",
    balance: 
      "Nhất quán, tiết chế lời nói\n" +
      "Có mục tiêu\n" +
      "Kỷ luật\n" +
      "Kiên định\n" +
      "Học cách cho đi\n" +
      "Yêu thương\n" +
      "Quan tâm người khác\n" +
      "Giữ lời hứa\n" +
      "Cân bằng cảm xúc\n" +
      "Nỗ lực nhiều hơn",
    careerSuggestions: 
      "Sự đa năng khiến bạn thích nghi được đa dạng nhiều ngành nghề\n" +
      "Các công việc được tự do sáng tạo, đổi mới liên tục\n" +
      "Công việc có yếu tố ngoại giao, tương tác với mọi người\n" +
      "Lĩnh vực nghệ thuật, thẩm mỹ, thiết kế, hay sáng tác",
    coreMessage: "Bạn sinh ra để truyền cảm hứng, sáng tạo và lan tỏa năng lượng tích cực."
  },

  "4": {
    number: 4,
    name: "NGƯỜI THẦY - SAO THIÊN VƯƠNG",
    planet: "SAO THIÊN VƯƠNG",
    keywords: [
      "Thực tế",
      "Thực thi",
      "Trung thực",
      "Tổ chức",
      "Nguyên tắc",
      "An toàn",
      "Ổn định",
      "Cần cù"
    ],
    advantages: 
      "Thực tế, quy trình, nghiêm túc, tập trung, chăm chỉ\n" +
      "An toàn, chắc chắn, trí tuệ, ham học hỏi, tập trung cao độ\n" +
      "Cẩn trọng, chi tiết, tính toán giỏi, logic, có trách nhiệm\n" +
      "Có tài tổ chức\n" +
      "Quan sát tốt\n" +
      "Chuẩn mực, kiên định, quyết đoán, kỷ luật\n" +
      "Chính trực, trung thành\n" +
      "Chung thủy, hướng về nhà\n" +
      "Sống lành mạnh, điềm tĩnh, kiên định\n" +
      "Ý chí vươn lên rất cao\n" +
      "Thầy đầy bao dung",
    challenges: 
      "Thiếu linh hoạt, thiếu khoan dung, cầu toàn quá, thiếu tự tin\n" +
      "Bướng bỉnh, nóng tính, áp đặt\n" +
      "Đa nghi, bi quan\n" +
      "Chậm hiểu, không dám hành động\n" +
      "Thẳng thắn quá, nói lời khó nghe\n" +
      "Khô khan, ít nói lời yêu thương\n" +
      "Tập trung vào cái gì thì khó tính cái đó\n" +
      "Mải làm việc, thiếu kết nối gia đình\n" +
      "Không thích người khác nói lời hoa mỹ\n" +
      "Hay tranh cãi hơn thua, rõ ràng quá\n" +
      "Khi có chuyện chỉ nhìn vào cái sai mà quên bức tranh tổng thể\n" +
      "Ích kỷ chỉ nghĩ cho bản thân\n" +
      "Tập trung quá vào tiền để coi thường người khác và bất chấp làm",
    balance: 
      "Sinh động hơn, mềm mẻ hơn\n" +
      "Mềm mỏng hơn, chia sẻ nhiều hơn\n" +
      "Sáng tạo hơn\n" +
      "Tham gia hoạt động có tính thử thách, mạo hiểm\n" +
      "Cởi mở, mở lòng, chia sẻ cảm xúc trong công việc, nắm bắt cơ hội\n" +
      "Đặt mình vào người khác\n" +
      "Bao dung, thông cảm, thấu hiểu, quan tâm\n" +
      "Bớt tập trung vào tiền, tập trung vào giá trị, trao giá trị\n" +
      "Nói lời yêu thương nhiều hơn\n" +
      "Khiêm hạ\n" +
      "Linh hoạt về ngôn từ",
    careerSuggestions: 
      "Những lĩnh vực mà sự tiếp cận đòi hỏi tính kỷ luật & phương pháp luận như:\n" +
      "→ Luật, tài chính, khoa học, xây dựng, chế tạo, thiết bị,…\n" +
      "Công việc có tính quy trình, phát huy được năng lực tổ chức\n" +
      "→ Quản lý dự án, sản xuất,…\n" +
      "Giảng dạy, đào tạo, chuyên môn\n" +
      "\n" +
      "🎯 NÓI THẲNG CHO BẠN HIỂU SỐ 4 (QUAN TRỌNG)\n" +
      "\n" +
      "👉 Số 4 không phải là “người giỏi nhất”\n" +
      "👉 Nhưng là người làm cho mọi thứ chạy được\n" +
      "\n" +
      "Không có 4 → team vỡ trận\n" +
      "Có 4 → team ổn định, có hệ thống\n" +
      "\n" +
      "⚠️ MẶT TỐI CỦA SỐ 4:\n" +
      "Quá nguyên tắc → giết sáng tạo\n" +
      "Quá an toàn → không dám bứt phá\n" +
      "Quá chi tiết → chậm tốc độ\n" +
      "\n" +
      "🔥 DÙNG TRONG KINH DOANH:\n" +
      "\n" +
      "👉 Số 4 là:\n" +
      "\n" +
      "Người xây quy trình\n" +
      "Người giữ kỷ luật\n" +
      "Người biến ý tưởng thành hệ thống",
    coreMessage: "Bạn sinh ra để xây dựng nền tảng vững chắc, tổ chức và giữ cho mọi thứ vận hành trơn tru."
  },

   "5": {
    number: 5,
    name: "PHIÊU DU - SAO THỦY",
    planet: "SAO THỦY",
    keywords: [
      "Tự do",
      "Linh hoạt",
      "Trải nghiệm",
      "Lôi cuốn",
      "Vui vẻ",
      "Đa năng",
      "Sáng tạo",
      "Thích nghi"
    ],
    advantages: 
      "Tự do, vui vẻ, cởi mở, kết nối, phiêu lưu, khám phá\n" +
      "Tầm nhìn xa, ham học hỏi\n" +
      "Sáng tạo, linh hoạt, mới mẻ, nghệ thuật\n" +
      "Thăng hoa cảm xúc\n" +
      "Cải tiến, thích cái mới\n" +
      "Dễ nắm bắt cơ hội\n" +
      "Phóng khoáng, thích cái đẹp\n" +
      "Tháo vát, đa tài\n" +
      "Giao tiếp tốt, nói chuyện lôi cuốn\n" +
      "Dễ thích nghi",
    challenges: 
      "Không tập trung\n" +
      "Thiếu thực tế, thiếu kỷ luật, không chịu được áp lực\n" +
      "Vội vàng ra quyết định, dễ thay đổi, đa mục tiêu\n" +
      "Bốc đồng, nói xàm, hoang phí\n" +
      "Ham vui, thất hứa, hay trễ giờ, hay quên, không sâu sắc\n" +
      "Nhanh chán, lười biếng\n" +
      "Dễ tụt cảm xúc\n" +
      "Không quan tâm người khác\n" +
      "Không có bạn chất lượng\n" +
      "Thích thế giới bên ngoài\n" +
      "Dễ sa đà, bất cần, tự tin thái quá\n" +
      "Buông thả bản thân",
    balance: 
      "Cần tập trung\n" +
      "Cần sự rõ ràng\n" +
      "Kỷ luật hơn, quy trình\n" +
      "Mục tiêu, kiên định, nhất quán\n" +
      "Cần kiên nhẫn, cần người giám sát\n" +
      "Cam kết, giữ lời hứa\n" +
      "Tĩnh lặng, quay vào bên trong\n" +
      "Quan tâm, chăm sóc\n" +
      "Tiết kiệm",
    careerSuggestions: 
      "Phù hợp nhiều ngành nghề, những công việc có cơ hội tương tác, giao tiếp nhiều như bán hàng, truyền thông, tiếp thị,...\n" +
      "Những công việc có yếu tố di chuyển, trải nghiệm\n" +
      "Những dự án cần có sự sáng tạo và đổi mới liên tục",
    coreMessage: "Bạn sinh ra để khám phá, trải nghiệm tự do và mang lại sự mới mẻ cho cuộc sống."
  },

  "6": {
    number: 6,
    name: "GIA ĐÌNH - SAO KIM",
    planet: "SAO KIM",
    keywords: [
      "Yêu thương",
      "Quan tâm",
      "Đáng tin cậy",
      "Thấu hiểu",
      "Trách nhiệm",
      "Tinh tế",
      "Săn sóc",
      "Che chở"
    ],
    advantages: 
      "Hết lòng yêu thương\n" +
      "Chăm sóc, chu đáo\n" +
      "Nuôi dưỡng, che chở\n" +
      "Người của gia đình\n" +
      "Quan tâm, bao dung\n" +
      "Trách nhiệm\n" +
      "Hy sinh, phụng sự, thấu hiểu\n" +
      "Nhân đạo, từ bi\n" +
      "Hỗ trợ\n" +
      "Khả năng đặc biệt sáng tạo trực tiếp (tích cực)\n" +
      "Đáng tin cậy",
    challenges: 
      "Yêu thương không đúng cách\n" +
      "Kỳ vọng cao, cố chấp\n" +
      "Thích kiểm soát, áp đặt\n" +
      "Ôm đồm\n" +
      "Cầu toàn\n" +
      "Bảo bọc quá mức\n" +
      "Không yêu bản thân\n" +
      "Cam chịu, hay lo lắng\n" +
      "Hay để ý cảm xúc người khác\n" +
      "Hay trách bản thân\n" +
      "Hay can thiệp vào chuyện của người khác",
    balance: 
      "Yêu thương chính mình hơn\n" +
      "Lắng nghe (do hay áp đặt)\n" +
      "Tôn trọng nhu cầu của người khác\n" +
      "Yêu thương đúng cách\n" +
      "Cần trao quyền\n" +
      "Tin tưởng người khác\n" +
      "Chia sẻ với người khác",
    careerSuggestions: 
      "Những công việc có tính chất lãnh đạo, tự chủ, được ra quyết định và chịu trách nhiệm\n" +
      "Lĩnh vực có yếu tố nhân văn như giáo dục, y tế, chăm sóc,…\n" +
      "Các mảng về tư vấn coaching, chữa lành con người\n" +
      "Sáng tạo nghệ thuật, thẩm mỹ",
    coreMessage: "Bạn sinh ra để yêu thương, chăm sóc và xây dựng sự gắn kết gia đình & cộng đồng."
  },

  "7": {
    number: 7,
    name: "CHIÊM NGHIỆM, CHIẾN LƯỢC GIA - SAO HẢI VƯƠNG",
    planet: "SAO HẢI VƯƠNG",
    keywords: [
      "Kín đáo",
      "Trực giác",
      "Hướng nội",
      "Lý trí",
      "Chiêm nghiệm",
      "Đúc kết",
      "Cầu toàn",
      "Sâu sắc"
    ],
    advantages: 
      "Phân tích, trải nghiệm, cẩn thận, cầu toàn, ham học hỏi\n" +
      "Độc lập, lý trí, logic, sáng tạo\n" +
      "Khám phá thế giới nội tâm của mình (tự tìm câu trả lời)\n" +
      "Tâm lý, nội tâm sâu sắc, điềm tĩnh\n" +
      "Có kỹ năng phân tích nghiên cứu, quan sát tốt, nhìn nhận người khác tốt\n" +
      "Thực tế, tiết chế cảm xúc tốt\n" +
      "Khoa học tâm linh\n" +
      "Tập trung cao vào mục tiêu, giỏi tìm tòi, suy nghĩ, phân tích\n" +
      "Sống lành mạnh, đơn giản\n" +
      "Trung thành, tốt bụng\n" +
      "Im lặng quan sát",
    challenges: 
      "Không có tham vọng\n" +
      "Không tập trung lắng nghe, hay quên, chậm chạp, trễ giờ\n" +
      "Bảo thủ, nổi loạn, bi quan, tiêu cực, đa nghi\n" +
      "Thích một mình, không chia sẻ, cam chịu\n" +
      "Cô độc, quên tạm thời\n" +
      "Không tập trung vào người khác\n" +
      "Tại 1 thời điểm chỉ làm được 1 việc, khó linh hoạt\n" +
      "Khó khăn, không linh hoạt, không thích bị điều khiển\n" +
      "Khó thay đổi, khó có cảm xúc\n" +
      "Không quan tâm mọi thứ xung quanh, khép kín quá mức\n" +
      "Khó đón nhận cái mới\n" +
      "Không thích làm việc chân tay, lười biếng",
    balance: 
      "Lắng nghe\n" +
      "Linh hoạt hơn\n" +
      "Cần tin tưởng, trao quyền\n" +
      "Chia sẻ, quan tâm\n" +
      "Mở lòng, chủ động kết nối, giao tiếp\n" +
      "Hòa đồng\n" +
      "Khiêm hạ",
    careerSuggestions: 
      "Lĩnh vực nào cần nghiên cứu chuyên sâu, giải mã sự thật, bí ẩn\n" +
      "Nhà nghiên cứu, khoa học, giảng dạy, đào tạo\n" +
      "Nghiên cứu tâm linh",
    coreMessage: "Bạn sinh ra để chiêm nghiệm sâu sắc, phân tích và khám phá chân lý nội tâm."
  },

  "8": {
    number: 8,
    name: "KINH DOANH, CHUYÊN GIA - SAO THỔ",
    planet: "SAO THỔ",
    keywords: [
      "Tầm nhìn",
      "Óc tổ chức",
      "Thực tế",
      "Nguyên tắc",
      "Điều hành",
      "Thành tựu",
      "Khát vọng",
      "Công bằng"
    ],
    advantages: 
      "Doanh nhân, chuyên gia\n" +
      "Quản lý, có tổ chức\n" +
      "Điều hành, dẫn dắt\n" +
      "Độc lập\n" +
      "Kỷ luật, năng nổ, chăm chỉ\n" +
      "Thực tế, mục tiêu\n" +
      "Tài chính\n" +
      "Bản lĩnh, mục tiêu\n" +
      "Phán đoán đúng\n" +
      "Chia sẻ\n" +
      "Nghĩ đến lợi ích bản thân & người khác",
    challenges: 
      "Thiếu thấu hiểu\n" +
      "Nghiện việc\n" +
      "Thiếu linh hoạt, độc đoán\n" +
      "Mất cân bằng cuộc sống\n" +
      "Nóng tính, khó chấp nhận người khác làm sai với mình\n" +
      "Áp đặt, cầu toàn, hay soi mói\n" +
      "Bất cần, độc đoán\n" +
      "Thẳng thắn quá, làm đi đôi với nói\n" +
      "Hay đe dọa, tỏ ra trên cơ người khác\n" +
      "Ham tiền, ham quyền hạn\n" +
      "Dễ thiếu đi lòng biết ơn\n" +
      "Cho cái gì rồi mới làm, con số hơn thua\n" +
      "Xem trọng tiền bạc quá",
    balance: 
      "Linh hoạt hơn, bớt cầu toàn\n" +
      "Tiết chế cảm xúc\n" +
      "Học cách lắng nghe\n" +
      "Cân bằng trong bánh xe cuộc đời\n" +
      "Cần quan tâm hơn đến cảm xúc người khác\n" +
      "Tham gia vào cộng đồng yêu thương\n" +
      "Khiêm hạ",
    careerSuggestions: 
      "Kinh doanh, chính trị, luật, tài chính,…\n" +
      "Công việc có tính chất quản lý, điều hành, sắp xếp trật tự các tổ chức\n" +
      "Công việc hoạch định chiến lược, phát huy năng lực lãnh đạo và tầm ảnh hưởng của bản thân",
    coreMessage: "Bạn sinh ra để đạt thành tựu lớn, lãnh đạo và xây dựng giá trị bền vững."
  },

  "9": {
    number: 9,
    name: "NHÂN ĐẠO, CỘNG ĐỒNG - SAO HỎA",
    planet: "SAO HỎA",
    keywords: [
      "Lý tưởng",
      "Cho đi",
      "Trực giác",
      "Thông thái",
      "Sáng tạo",
      "Nhân đạo",
      "Lãnh đạo",
      "Trách nhiệm"
    ],
    advantages: 
      "Thân thiện, hòa đồng, vị tha, yêu thương\n" +
      "Lý tưởng, cống hiến, trách nhiệm, cho đi\n" +
      "Hướng đến cái đẹp: chân thiện mỹ\n" +
      "Tốt bụng, truyền cảm hứng, cầu toàn bản thân\n" +
      "Cộng đồng",
    challenges: 
      "Dao động, thiếu thực tế\n" +
      "Xem nhẹ vật chất\n" +
      "Dễ bị lợi dụng\n" +
      "Cho đi không đúng cách\n" +
      "Không yêu thương bản thân\n" +
      "Yêu cầu cao bản thân về trách nhiệm\n" +
      "Không quan tâm gia đình, hướng ra ngoài nhiều quá\n" +
      "Khi thất bại dễ sa vào oán trách bản thân, thiếu tự tin",
    balance: 
      "Chọn lọc\n" +
      "Thực tế\n" +
      "Tỉnh táo\n" +
      "Lý trí\n" +
      "Tập trung\n" +
      "Yêu thương bản thân\n" +
      "Cân bằng giữa gia đình & xã hội",
    careerSuggestions: 
      "Những công việc có yếu tố con người như: tư vấn, chữa lành, giáo dục,…\n" +
      "Những ngành nghề phát huy năng lực sáng tạo, tưởng tượng và nghệ thuật\n" +
      "Công việc cho phép giữ vai trò lãnh đạo, dẫn dắt người khác",
    coreMessage: "Bạn sinh ra để cống hiến, nhân đạo và mang lại giá trị cho cộng đồng."
  },

  "11": {
    number: "11/2",
    name: "NGƯỜI KHAI SÁNG - MẶT TRĂNG",
    planet: "MẶT TRĂNG",
    keywords: [
      "Trực giác",
      "Tầm nhìn",
      "Tâm linh",
      "Lôi cuốn",
      "Mạnh mẽ",
      "Sáng tạo",
      "Dẫn dắt",
      "Yêu thương"
    ],
    advantages: 
      "Thủ lĩnh của thủ lĩnh, trách nhiệm\n" +
      "Trực giác phát triển mạnh mẽ\n" +
      "Sáng tạo, hòa đồng, hợp tác\n" +
      "Tâm linh mạnh mẽ & khả năng chữa lành\n" +
      "Sứ giả hòa bình, kết nối, giúp đỡ người khác tỏa sáng\n" +
      "Khi ở gần người 11/2 có cảm giác rất dễ chịu\n" +
      "Có khả năng truyền cảm hứng, truyền động lực\n" +
      "Bao dung, giàu yêu thương",
    challenges: 
      "Làm việc theo cá nhân không dùng hết năng lượng của số 1 & 2 sẽ không thuận lợi & trở ngại trong cuộc sống\n" +
      "Cái tôi cao, bảo thủ, cố chấp\n" +
      "Không lắng nghe\n" +
      "Muốn được ghi nhận\n" +
      "Dễ tụt cảm xúc, bất cần\n" +
      "Cầu toàn, quá thiếu tự tin\n" +
      "Thiếu trung thực, né tránh, sợ hãi\n" +
      "Cảm xúc dữ dội, hay ảo tưởng\n" +
      "Nhạy cảm thái quá",
    balance: 
      "Hãy phát triển & làm việc theo đội nhóm sẽ thành công mỹ mãn\n" +
      "Lắng nghe trực giác bên trong (tâm linh, giác quan)\n" +
      "Tập trung vun trồng lòng biết ơn\n" +
      "Khiêm hạ",
    careerSuggestions: 
      "Lĩnh vực phát triển bản thân, tâm linh, chữa lành, coaching\n" +
      "Lĩnh vực nghệ thuật, thẩm mỹ, sáng tạo giúp mình thể hiện bản thân\n" +
      "Giáo dục hoặc những ngành nghiên cứu, học thuật",
    coreMessage: "Bạn sinh ra để khai sáng, chữa lành và dẫn dắt người khác bằng trực giác mạnh mẽ."
  },

  "22": {
    number: "22/4",
    name: "NGƯỜI KIẾN TẠO - SAO THIÊN VƯƠNG",
    planet: "SAO THIÊN VƯƠNG",
    keywords: [
      "Trực giác",
      "Quyền lực",
      "Mạnh mẽ",
      "Thực tế",
      "Cân bằng",
      "Tầm ảnh hưởng",
      "Logic",
      "Thực thi"
    ],
    advantages: 
      "* Có khả năng đặc biệt, tập trung cao\n" +
      "* Tầm nhìn lớn\n" +
      "* Trực giác tốt, suy nghĩ tiến bộ\n" +
      "* Năng lượng thực thi mạnh\n" +
      "* Khả năng đánh giá, phân tích cơ hội tuyệt vời\n" +
      "* Sáng tạo trong công việc\n" +
      "* Chân thành & trung thành\n" +
      "* Kỷ luật, suy nghĩ độc đáo & khác biệt\n" +
      "* Có “rung động” của 2 & 4 (cảm xúc + hệ thống)",
    challenges: 
      "* Suy nghĩ bay bổng xa thực tế, khó tính\n" +
      "* Bảo thủ, khô khan, thiếu linh hoạt\n" +
      "* Nghiện công việc\n" +
      "* Không kiên trì, hay trì hoãn (nghe ngược đời nhưng đúng 😄)\n" +
      "* Nguyên tắc quá mức, kỹ tính\n" +
      "* Thích kiểm soát\n" +
      "* Dễ mất cân bằng cảm xúc\n" +
      "* Cái tôi cao, bướng bỉnh\n" +
      "* Ích kỷ cá nhân, ham tiền, ham công việc\n" +
      "* Nóng tính, thiếu quan tâm cảm xúc người khác\n" +
      "* Ít bạn, đa nghi\n" +
      "* Khó chấp nhận điều trái ý, hay nói lời không hay",
    balance: 
      "* Lắng nghe trực giác\n" +
      "* Cân bằng cảm xúc\n" +
      "* Kỷ luật bản thân (đúng cách, không cực đoan)\n" +
      "* Nhận thức rõ khả năng đặc biệt của mình trong nhóm\n" +
      "* Cởi mở, mềm mỏng hơn, nói lời yêu thương nhiều hơn\n" +
      "* Bao dung, thông cảm\n" +
      "* Giảm ám ảnh tiền & công việc\n" +
      "* Khiêm hạ, vun trồng lòng biết ơn",
    careerSuggestions: 
      "Công việc có lộ trình thăng tiến rõ ràng về địa vị, chức danh, thu nhập, bạn có thể vươn đến hàng đầu dù ở bất cứ đâu\n" +
      "Lĩnh vực chính trị, luật pháp, giảng dạy hay kinh doanh\n" +
      "Công việc mang đến cơ hội dẫn dắt, lãnh đạo để phát triển tầm ảnh hưởng của bản thân",
    coreMessage: "Bạn sinh ra để kiến tạo những công trình lớn lao, kết hợp trực giác và thực thi mạnh mẽ."
  },

  "33": {
    number: "33/6",
    name: "NGƯỜI CHỮA LÀNH - SAO KIM",
    planet: "SAO KIM",
    keywords: [
      "Rộng lượng",
      "Yêu thương",
      "Vị tha",
      "Nhân đạo",
      "Có trực giác tốt",
      "Trách nhiệm",
      "Che chở",
      "Đáng tin cậy"
    ],
    advantages: 
      "Khả năng chữa lành, sáng tạo\n" +
      "Tấm gương soi sáng thông qua hành vi, hành động cho người khác thấy tình yêu vĩ đại là gì\n" +
      "Vị tha, rộng lượng, hoan hỷ, vui tươi, giàu tình yêu thương\n" +
      "Mang nhiệm vụ xã hội & gia đình\n" +
      "Nhân đạo, truyền cảm hứng, thúc đẩy người khác\n" +
      "Có khả năng tâm linh\n" +
      "Năng lượng số 3 & 6",
    challenges: 
      "Nhiều áp lực, thách thức, trở ngại\n" +
      "Tổn thương, nhạy cảm về tâm lý\n" +
      "Mất kết nối vợ chồng, con cái, cha mẹ, anh chị em\n" +
      "Yêu thương không đúng cách\n" +
      "Cố chấp, áp đặt\n" +
      "Không yêu thương bản thân\n" +
      "Kỳ tính\n" +
      "Tự cho là mình đúng\n" +
      "Tham công việc, hay chỉ trích",
    balance: 
      "Học cách buông bỏ\n" +
      "Cân bằng giữa xã hội & gia đình\n" +
      "Cởi mở, yêu thương, hoan hỷ\n" +
      "Làm mọi việc bằng tình yêu thương & san sẻ tình yêu thương, từ bi, tha thứ\n" +
      "Cởi mở, mềm mỏng hơn, nói lời yêu thương nhiều hơn\n" +
      "Bao dung, thông cảm\n" +
      "Bớt tập trung vào tiền, công việc\n" +
      "Khiêm hạ\n" +
      "Vun trồng lòng biết ơn",
    careerSuggestions: 
      "Nhà tư vấn trị liệu tâm lý\n" +
      "Chuyên gia về sức khỏe, y tế\n" +
      "Hoạt động về cộng đồng, nhân đạo\n" +
      "Nghệ sĩ, nhà văn, nhạc sĩ, nhà thiết kế\n" +
      "Người chữa lành, bác sĩ",
    coreMessage: "Bạn sinh ra để chữa lành, truyền yêu thương và mang lại sự cân bằng cho xã hội & gia đình."
  }
};
