export type GuardrailKey = "spelling" | "clean-visual" | "safe-logo" | "fact-check";

export type GuardrailItem = {
  number: string;
  key: GuardrailKey;
  title: string;
  description: string;
  badge: string;
  checks: string[];
};

export const guardrailsContent = {
  eyebrow: "Cam kết chất lượng",
  title: "4 chốt chặn kiểm duyệt trước khi bài viết xuất hiện trên trang của bạn",
  description:
    "Mỗi bài viết và hình ảnh đều đi qua đủ 4 lớp rà soát thực tế trên khung nhìn điện thoại trước khi được gửi sang cổng duyệt riêng.",
} as const;

export const guardrailItems: GuardrailItem[] = [
  {
    number: "01",
    key: "spelling",
    title: "Chính tả tiếng Việt chuẩn 100%",
    description:
      "Kiểm tra từng dấu thanh trên cả hình ảnh lẫn caption ngay trên màn hình điện thoại thật, đảm bảo không mất dấu, không ngắt dòng vô duyên.",
    badge: "Rà dấu & ngắt dòng",
    checks: ["Đúng dấu tiếng Việt trên ảnh", "Không dính ký tự lạ khi lên Facebook"],
  },
  {
    number: "02",
    key: "clean-visual",
    title: "Không dị dạng, không watermark",
    description:
      "Loại bỏ hoàn toàn hình ảnh lỗi chi tiết bàn tay, khuôn mặt thiếu tự nhiên, vật thể biến dạng hoặc dính logo nguồn lạ.",
    badge: "Ánh sáng đời thực",
    checks: ["Tỉ lệ người và vật chuẩn xác", "Sạch dấu vết nguồn ngoài"],
  },
  {
    number: "03",
    key: "safe-logo",
    title: "Logo gốc đúng vùng an toàn",
    description:
      "Luôn ghép từ file logo gốc PNG hoặc SVG của thương hiệu bạn, căn đúng khoảng cách lề an toàn và kiểm tra độ tương phản với nền ảnh.",
    badge: "File gốc PNG / SVG",
    checks: ["Không méo chữ hay đổi màu logo", "Không bị che khi cắt khung feed"],
  },
  {
    number: "04",
    key: "fact-check",
    title: "Trung thực dữ kiện & sạch dấu vết",
    description:
      "Tuyệt đối không tự bịa bảng giá, địa chỉ hay chương trình khuyến mãi khi thiếu thông tin. Mọi văn bản được làm sạch định dạng trước khi đăng.",
    badge: "Đối chiếu Brand Kit",
    checks: ["Giá và địa chỉ khớp hồ sơ gốc", "Bỏ định dạng thừa trước khi đăng"],
  },
];
