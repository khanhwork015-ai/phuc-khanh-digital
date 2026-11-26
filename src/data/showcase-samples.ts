import { hoaSuaPost } from "./site-config";

export type ShowcaseTab = "caption" | "visual";

export type CaptionSample = {
  id: string;
  industry: string;
  brandName: string;
  before: {
    label: string;
    text: string;
    issues: string[];
  };
  after: {
    label: string;
    text: string;
    highlights: string[];
  };
};

export type VisualSample = {
  id: string;
  brandName: string;
  industry: string;
  photoTitle: string;
  photoSub: string;
  logoLabel: string;
  logoPosition: "top-right" | "top-left" | "bottom-right";
  palette: {
    bg: string;
    surface: string;
    accent: string;
    text: string;
  };
  aspectNote: string;
  checks: string[];
};

export const showcaseContent = {
  eyebrow: "Sản phẩm mẫu",
  title: "Khác biệt nhìn thấy ngay trên từng câu chữ và khung hình",
  description:
    "So sánh trực tiếp một bài viết mẫu rập khuôn với bài đã biên tập 2 lượt theo hồ sơ thương hiệu riêng, cùng cách đặt logo gốc đúng vùng an toàn.",
  note: "Bài Hoa Sữa sử dụng nội dung và hình ảnh tham chiếu được cung cấp. Bản trước biên tập và các thương hiệu còn lại là ví dụ minh họa.",
  tabs: [
    { key: "caption" as const, label: "So sánh Caption" },
    { key: "visual" as const, label: "Ảnh gắn Logo gốc" },
  ],
} as const;

export const captionSamples: CaptionSample[] = [
  {
    id: "hoa-sua",
    industry: "Cà phê & trà",
    brandName: hoaSuaPost.pageName,
    before: {
      label: "Bài viết rập khuôn thường gặp",
      text: "🔥 NGÀY LỄ ĐẾN RỒI, BẠN ĐÃ CÓ ĐIỂM HẸN LÝ TƯỞNG CHƯA? ✨\n\n🌟 Hãy đến với chúng tôi để tận hưởng không gian tuyệt vời và những thức uống thơm ngon!\n✅ Không gian ấm cúng\n✅ Phục vụ tận tâm\n✅ Trải nghiệm khó quên\n\n👉 Ghé ngay hôm nay để cùng tận hưởng ngày lễ nhé cả nhà yêu!!! 💬",
      issues: [
        "Mở đầu hỏi sáo rỗng, đọc là thấy văn mẫu",
        "Liệt kê gạch đầu dòng kèm nhiều emoji rối mắt",
        "Không nêu ngày lễ và tình trạng hoạt động cụ thể",
      ],
    },
    after: {
      label: "Sau biên tập 2 lượt",
      text: hoaSuaPost.caption,
      highlights: [
        "Nêu rõ thông báo hoạt động ngày 24/11 ngay từ đầu",
        "Giữ đúng thông tin Hoa Sữa vẫn hoạt động bình thường",
        "Giọng lịch sự, xưng hô \"Quý khách\" theo bài tham chiếu",
      ],
    },
  },
  {
    id: "dental",
    industry: "Phòng khám nha khoa",
    brandName: "Nha Khoa Bình Minh",
    before: {
      label: "Bài viết rập khuôn thường gặp",
      text: "💎 NỤ CƯỜI TỎA SÁNG - TỰ TIN TỎA KHÍ CHẤT! ✨\n\nBạn có biết nụ cười chính là chìa khóa mở ra cánh cửa thành công? Đừng để những khuyết điểm nhỏ làm bạn mất tự tin trong giao tiếp!\n🌟 Công nghệ hiện đại hàng đầu\n🌟 Đội ngũ bác sĩ giàu kinh nghiệm\n🌟 Chi phí hợp lý cho mọi khách hàng\n\n📲 Đặt lịch ngay hôm nay để trải nghiệm dịch vụ đẳng cấp 5 sao!",
      issues: [
        "Dùng cụm từ chung chung, thiếu độ tin cậy ngành y tế",
        "Không nêu rõ dịch vụ, thời gian làm việc hay chi phí tham khảo",
        "Giọng điệu quảng cáo quá đà dễ gây phản cảm",
      ],
    },
    after: {
      label: "Sau biên tập 2 lượt",
      text: "Lấy cao răng định kỳ mất khoảng 25 phút, giúp giảm ê buốt và giữ nướu khỏe hơn trước khi mảng bám đóng cứng.\n\nTại Nha Khoa Bình Minh, gói cạo vôi đánh bóng là 200.000đ/lần, bác sĩ khám và báo tình trạng răng trước khi làm. Phòng khám mở đến 19:30 từ Thứ Hai đến Chủ nhật tại 48 Nguyễn Trãi.",
      highlights: [
        "Thông tin rõ ràng: thời gian 25 phút và chi phí 200.000đ",
        "Giọng điềm tĩnh, minh bạch, đúng chuẩn ngành nha",
        "Có khung giờ mở cửa tối để khách đi làm tiện ghé",
      ],
    },
  },
  {
    id: "furniture",
    industry: "Xưởng nội thất gỗ",
    brandName: "Xưởng Gỗ Thợ Mộc",
    before: {
      label: "Bài viết rập khuôn thường gặp",
      text: "🏡 BIẾN KHÔNG GIAN SỐNG THÀNH TỔ ẤM ĐẲNG CẤP CÙNG CHÚNG TÔI! ✨\n\nNội thất là linh hồn của ngôi nhà, nơi lưu giữ từng khoảnh khắc sum vầy của gia đình bạn.\n🪵 Chất liệu gỗ bền đẹp theo năm tháng\n🪵 Thiết kế sang trọng hợp mọi phong cách\n🪵 Thi công nhanh chóng, bảo hành chu đáo\n\n📩 Nhắn tin ngay để nhận tư vấn miễn phí!",
      issues: [
        "Dùng mẫu câu sáo rỗng, thiếu chất liệu và kích thước thật",
        "Không có kích thước, loại gỗ hay tiến độ giao hàng thật",
        "Khách khó hình dung sản phẩm cụ thể là gì",
      ],
    },
    after: {
      label: "Sau biên tập 2 lượt",
      text: "Bàn ăn gỗ sồi nguyên tấm dài 1m8 vừa hoàn thiện lớp lau dầu mờ cho nhà anh Minh ở Thủ Đức. Mặt bàn dày 4cm, bo cạnh tròn để nhà có trẻ nhỏ va vào không đau.\n\nXưởng nhận đóng theo kích thước phòng ăn từ 1m4 đến 2m2, giao lắp trong 10 ngày. Bạn gửi mặt bằng bếp qua tin nhắn để thợ báo giá chi tiết nhé.",
      highlights: [
        "Mô tả chi tiết thật: gỗ sồi 1m8, dày 4cm, bo cạnh an toàn",
        "Nêu rõ thời gian hoàn thiện 10 ngày và dải kích thước nhận làm",
        "Ngôn ngữ gần gũi như lời người thợ chia sẻ",
      ],
    },
  },
];

export const visualSamples: VisualSample[] = [
  {
    id: "hoa-sua-visual",
    brandName: hoaSuaPost.pageName,
    industry: "F&B · Cà phê & trà",
    photoTitle: "Ngày Văn hóa Việt Nam · 24/11/2026",
    photoSub: hoaSuaPost.address,
    logoLabel: "HOA SỮA",
    logoPosition: "top-left",
    palette: {
      bg: "#192938",
      surface: "#243b2a",
      accent: "#b6c97d",
      text: "#fbefdc",
    },
    aspectNote: "Giữ nguyên ảnh tham chiếu · Logo góc trái trên · Hiển thị trọn ảnh",
    checks: ["Logo đúng ảnh được cung cấp", "Giữ nguyên nội dung ngày 24/11/2026", "Không cắt tiêu đề và địa chỉ"],
  },
  {
    id: "binh-minh-visual",
    brandName: "Nha Khoa Bình Minh",
    industry: "Y tế · Nha khoa",
    photoTitle: "Lấy cao răng nhẹ nhàng 25 phút",
    photoSub: "200.000đ/lần · Mở cửa tới 19:30",
    logoLabel: "BÌNH MINH",
    logoPosition: "top-left",
    palette: {
      bg: "#101920",
      surface: "#172530",
      accent: "#7ec8e3",
      text: "#f0f7fa",
    },
    aspectNote: "Logo góc trái trên · Nền tương phản cao · Dễ đọc trên di động",
    checks: ["Tông màu phòng khám sáng sạch", "Giá niêm yết rõ ràng", "Khoảng thở chữ thoáng"],
  },
  {
    id: "tho-moc-visual",
    brandName: "Xưởng Gỗ Thợ Mộc",
    industry: "Nội thất · Đóng theo yêu cầu",
    photoTitle: "Bàn ăn gỗ sồi bo cạnh an toàn",
    photoSub: "Dài 1m8 · Giao lắp sau 10 ngày",
    logoLabel: "THỢ MỘC",
    logoPosition: "bottom-right",
    palette: {
      bg: "#171411",
      surface: "#241e18",
      accent: "#d6a461",
      text: "#f6efe4",
    },
    aspectNote: "Logo góc phải dưới · Đặt trên vùng tối sạch · Không lấn sản phẩm",
    checks: ["Giữ nguyên vân gỗ và tỉ lệ thật", "Chú thích thông số gọn", "Logo không biến dạng"],
  },
  {
    id: "an-nhien-visual",
    brandName: "Trà Thảo Mộc An Nhiên",
    industry: "Bán lẻ · Đồ uống tự nhiên",
    photoTitle: "Trà hoa cúc táo đỏ ủ lạnh",
    photoSub: "Không đường tinh luyện · Hộp 15 gói",
    logoLabel: "AN NHIÊN",
    logoPosition: "top-right",
    palette: {
      bg: "#121a15",
      surface: "#1a271f",
      accent: "#9ec48f",
      text: "#eef5eb",
    },
    aspectNote: "Logo góc phải trên · Đệm nền mờ nhẹ · Nổi bật trên ảnh sáng/tối",
    checks: ["Tách rõ nhãn phụ và tiêu đề chính", "Cân đối khung 4:3 Facebook", "Sạch dấu vết và watermark"],
  },
];
