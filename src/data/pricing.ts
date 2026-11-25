import type { LeadPlanValue } from "@/lib/lead-fields";

export type PricingPlan = {
  id: LeadPlanValue;
  name: string;
  subtitle: string;
  priceLabel: string;
  billingNote: string;
  badge?: string;
  featured?: boolean;
  summary: string;
  features: string[];
  ctaLabel: string;
};

/**
 * Cấu hình bảng giá dịch vụ vận hành Fanpage trọn gói.
 * Có thể cập nhật trực tiếp priceLabel và billingNote tại đây.
 */
export const PRICING_CONFIG: PricingPlan[] = [
  {
    id: "standard",
    name: "Gói Khởi Động",
    subtitle: "Standard",
    priceLabel: "Liên hệ báo giá",
    billingNote: "Phù hợp SME mới xây kênh đều đặn",
    summary: "Duy trì nhịp đăng ổn định mỗi tuần với Brand Kit riêng và cổng duyệt bài 1 chạm.",
    features: [
      "12 bài viết hoàn chỉnh / tháng (tỷ lệ 60 / 25 / 15)",
      "Chuẩn hóa Brand Kit, giọng điệu và bảng từ cấm riêng",
      "Thiết kế ảnh gắn file logo gốc đúng vùng an toàn",
      "Cổng duyệt bài 1 chạm bảo mật bằng mã PIN",
      "Tự động đăng đúng khung giờ đã hẹn, báo cáo tháng",
    ],
    ctaLabel: "Tư vấn gói Khởi Động",
  },
  {
    id: "growth",
    name: "Gói Tăng Trưởng",
    subtitle: "Growth",
    priceLabel: "Liên hệ báo giá",
    billingNote: "Phù hợp doanh nghiệp cần phủ đều hằng tuần",
    badge: "Khuyên dùng",
    featured: true,
    summary: "Tăng tần suất xuất hiện với bài viết, video Reels ngắn và báo cáo số liệu thật mỗi tuần.",
    features: [
      "20 bài viết / tháng + video Reels ngắn xen kẽ",
      "Biên tập 2 lượt cho câu chữ tự nhiên, đúng chất thương hiệu",
      "Cổng duyệt bài 1 chạm, phản hồi chỉnh sửa trong ngày",
      "Báo cáo số liệu thật vào sáng Chủ nhật hằng tuần",
      "Tối ưu khung giờ đăng và chủ đề theo tương tác thực tế",
    ],
    ctaLabel: "Chọn gói Tăng Trưởng",
  },
  {
    id: "custom",
    name: "Gói Đa Kênh / Theo Yêu Cầu",
    subtitle: "Custom",
    priceLabel: "Thiết kế riêng",
    billingNote: "Dành cho chuỗi cửa hàng hoặc nhiều Fanpage",
    summary: "Vận hành đồng thời nhiều Fanpage hoặc thương hiệu con với hồ sơ tách biệt hoàn toàn.",
    features: [
      "Tùy chỉnh số lượng bài viết và Reels theo từng chi nhánh",
      "Mỗi Fanpage một Brand Kit và link duyệt PIN độc lập",
      "Đồng bộ lịch chiến dịch, khuyến mãi theo từng điểm bán",
      "Tổng hợp báo cáo so sánh hiệu quả giữa các trang",
      "Người phụ trách đồng hành xuyên suốt qua Zalo nhóm riêng",
    ],
    ctaLabel: "Nhận đề xuất gói riêng",
  },
];

export const pricingContent = {
  eyebrow: "Gói vận hành & FAQ",
  title: "Chọn nhịp độ phù hợp với giai đoạn của doanh nghiệp",
  description:
    "Không bán phần mềm để bạn tự xoay xở. Mỗi gói đều bao gồm đội ngũ biên tập, thiết kế ảnh gắn logo gốc và cổng duyệt riêng.",
  note: "Chi phí cụ thể được báo minh bạch theo ngành hàng và khối lượng hình ảnh/video thực tế sau buổi trao đổi 15 phút.",
} as const;
