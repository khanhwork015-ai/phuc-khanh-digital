import type { LeadPlanValue } from "@/lib/lead-fields";

export type PricingFeatureItem = {
  title: string;
  detail: string;
};

export type PricingPlan = {
  id: LeadPlanValue;
  name: string;
  subtitle: string;
  priceLabel: string;
  billingNote: string;
  badge?: string;
  featured?: boolean;
  summary: string;
  features: PricingFeatureItem[];
  ctaLabel: string;
};

export const PRICING_CONFIG: PricingPlan[] = [
  {
    id: "standard",
    name: "Dịch vụ quảng cáo Facebook & quản trị fanpage",
    subtitle: "Gói vận hành trọn gói",
    priceLabel: "2.000.000 VNĐ / tháng",
    billingNote: "Áp dụng cho 01 fanpage · 8–10 bài đăng mỗi tháng",
    badge: "Ưu đãi khai trương",
    featured: true,
    summary:
      "Phúc Khánh Digital đồng hành cùng Quý khách trong việc xây dựng nội dung, chăm sóc fanpage và triển khai quảng cáo phù hợp với mục tiêu kinh doanh. Chúng tôi mong muốn giúp doanh nghiệp xây dựng hình ảnh chỉn chu, tiếp cận khách hàng phù hợp và tạo thêm cơ hội tư vấn, bán hàng.",
    features: [
      {
        title: "Lập kế hoạch nội dung",
        detail: "Xây dựng chủ đề và lịch đăng phù hợp với sản phẩm, dịch vụ của doanh nghiệp.",
      },
      {
        title: "Sản xuất 8–10 bài đăng mỗi tháng",
        detail: "Bao gồm viết nội dung và thiết kế hình ảnh.",
      },
      {
        title: "Quay dựng video và chụp ảnh cho doanh nghiệp",
        detail:
          "Thực hiện hình ảnh, video giới thiệu sản phẩm, dịch vụ, không gian và hoạt động của doanh nghiệp, phục vụ nội dung fanpage và quảng cáo.",
      },
      {
        title: "Quản trị fanpage",
        detail: "Đăng bài theo lịch, cập nhật thông tin và theo dõi hoạt động của trang.",
      },
      {
        title: "Triển khai quảng cáo Facebook",
        detail: "Thiết lập, theo dõi và điều chỉnh chiến dịch theo mục tiêu, ngân sách đã thống nhất.",
      },
      {
        title: "Báo cáo kết quả hằng tháng",
        detail: "Tổng hợp hoạt động nội dung và kết quả quảng cáo để cùng đánh giá, điều chỉnh hướng triển khai.",
      },
    ],
    ctaLabel: "Đăng ký tư vấn gói dịch vụ",
  },
];

export const pricingContent = {
  eyebrow: "Gói vận hành & FAQ",
  title: "Dịch vụ quảng cáo Facebook & quản trị fanpage",
  description:
    "Chi phí minh bạch 2.000.000 đồng/tháng cho 01 fanpage, bao gồm đội ngũ biên tập, thiết kế ảnh gắn logo gốc và cổng duyệt bài riêng.",
  openingOffer: {
    badge: "Ưu đãi đồng hành nhân dịp khai trương",
    paragraphs: [
      "Hưởng ứng dịp khai trương, Phúc Khánh Digital dành tặng Quý khách dịch vụ quay dựng video và chụp ảnh miễn phí trong 3 tháng đầu, kể từ ngày khai trương công ty, khi sử dụng gói dịch vụ trên.",
      "Thông qua những hình ảnh, video được đầu tư và hoạt động truyền thông đều đặn, chúng tôi mong muốn giúp cửa hàng tạo dấu ấn ban đầu và đưa sản phẩm, dịch vụ đến gần hơn với khách hàng. Đây cũng là khoảng thời gian để Phúc Khánh Digital thể hiện chất lượng công việc, sự đồng hành và giá trị thực tế mang lại cho doanh nghiệp.",
    ],
  },
  cooperation: {
    title: "Hiệu quả và định hướng hợp tác lâu dài",
    paragraphs: [
      "Chúng tôi tập trung xây dựng nội dung phù hợp, duy trì sự hiện diện đều đặn và theo dõi kết quả quảng cáo để từng bước cải thiện hiệu quả. Trước khi triển khai, hai bên sẽ thống nhất mục tiêu ưu tiên và các chỉ số theo dõi phù hợp với tình hình kinh doanh.",
      "Sau 3 tháng, Phúc Khánh Digital sẽ cùng Quý khách nhìn lại những nội dung đã thực hiện và kết quả thực tế đạt được. Nếu Quý khách mong muốn tiếp tục đồng hành, hai bên sẽ trao đổi và thống nhất mức phí cho giai đoạn tiếp theo dựa trên nhu cầu, khối lượng công việc và phạm vi dịch vụ, trước khi tiếp tục triển khai.",
    ],
  },
  note: "Lưu ý: Áp dụng cho 01 fanpage. Giá chưa bao gồm tiền chạy quảng cáo trả cho Meta. Khách hàng duyệt nội dung và ngân sách trước khi thực hiện.",
} as const;
