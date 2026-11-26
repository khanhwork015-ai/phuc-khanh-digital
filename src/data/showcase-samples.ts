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
  photoSrc: string;
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
  note: "Nội dung và hình ảnh mẫu sử dụng tài liệu tham chiếu của Hoa Sữa và SHIN AIOS. Bản trước biên tập là ví dụ minh họa.",
  tabs: [
    { key: "caption" as const, label: "So sánh Caption" },
    { key: "visual" as const, label: "Ảnh gắn Logo gốc" },
  ],
} as const;

export const captionSamples: CaptionSample[] = [
  {
    id: "hoa-sua",
    industry: "Cà phê & trà · Hoa Sữa",
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
    id: "shin-aios",
    industry: "Vận hành Fanpage · SHIN AIOS",
    brandName: "SHIN AIOS",
    before: {
      label: "Bài viết rập khuôn thường gặp",
      text: "🚀 BỨT PHÁ DOANH THU FANPAGE CHỈ TRONG 30 NGÀY! ✨\n\nBạn đang đau đầu vì Fanpage không có tương tác? Hãy để chúng tôi giúp bạn!\n🌟 Nội dung chuẩn SEO, sáng tạo đỉnh cao\n🌟 Hình ảnh chuyên nghiệp, thu hút triệu view\n🌟 Cam kết hiệu quả vượt trội 100%\n\n📩 Inbox ngay hôm nay để nhận ưu đãi cực sốc!!!",
      issues: [
        "Dùng lời hứa chung chung, từ ngữ phô trương thiếu thực tế",
        "Không giải thích quy trình làm việc thật sau khi ký hợp đồng",
        "Khách hàng doanh nghiệp đọc không thấy điểm khác biệt",
      ],
    },
    after: {
      label: "Sau biên tập 2 lượt",
      text: "Thuê ngoài viết bài mà ký hợp đồng xong vẫn phải tự viết nháp ý chính gửi qua thì cũng mệt không kém tự làm.\n\nỞ SHIN AIOS, ngay sau khi chốt hợp đồng, đội ngũ trực tiếp thu thập Brand Kit, sản xuất bài viết, thiết kế ảnh gắn logo và gửi bạn duyệt bằng 1 chạm.\n\n#SHINAIOS #DichVuFanpage #VanHanhNoiDung",
      highlights: [
        "Chạm đúng nỗi đau thực tế của chủ doanh nghiệp khi thuê ngoài",
        "Nêu rõ quy trình: thu thập Brand Kit → viết & thiết kế → duyệt 1 chạm",
        "Giọng văn điềm tĩnh, thực tế, không dùng từ cam kết quá đà",
      ],
    },
  },
];

export const visualSamples: VisualSample[] = [
  {
    id: "hoa-sua-visual",
    brandName: hoaSuaPost.pageName,
    industry: "F&B · Cà phê & trà",
    photoSrc: hoaSuaPost.photoSrc,
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
    id: "shin-aios-visual",
    brandName: "SHIN AIOS",
    industry: "Dịch vụ B2B · Vận hành Fanpage",
    photoSrc: "/samples/shin-aios/post-1.jpg",
    photoTitle: "Bạn chỉ cần duyệt bài · SHIN AIOS lo trọn gói vận hành",
    photoSub: "Logo góc phải trên · Hiển thị trọn khung hình",
    logoLabel: "SHIN AIOS",
    logoPosition: "top-right",
    palette: {
      bg: "#101926",
      surface: "#172538",
      accent: "#7cc4fa",
      text: "#f8fafc",
    },
    aspectNote: "Giữ trọn ảnh ngang · Logo góc phải trên · Tương phản rõ ràng",
    checks: ["Không cắt chữ tiêu đề", "Đúng bảng màu #7CC4FA · #1E3A5F", "Logo nằm gọn trong vùng an toàn"],
  },
];
