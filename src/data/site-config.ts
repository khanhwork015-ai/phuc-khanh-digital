export const siteConfig = {
  name: "Phúc Khánh Digital",
  url: "https://phuckhanhdigital.vn",
  description:
    "Dịch vụ vận hành Fanpage trọn gói cho SME Việt Nam: Brand Kit riêng, bài viết tự nhiên, ảnh gắn logo gốc, cổng duyệt bài 1 chạm và đăng đúng giờ.",
  nav: [
    { label: "Quy trình", href: "#quy-trinh" },
    { label: "Cổng duyệt bài", href: "#cong-duyet-bai" },
    { label: "Sản phẩm mẫu", href: "#san-pham-mau" },
    { label: "Gói vận hành", href: "#goi-van-hanh" },
  ],
  cta: { label: "Nhận tư vấn", href: "#dang-ky-tu-van" },
} as const;

export const heroContent = {
  badge: "Vận hành Fanpage trọn gói cho SME Việt Nam",
  headline: "Giữ trọn chất riêng thương hiệu trên từng bài đăng Fanpage.",
  subheadline:
    "Từ chuẩn hóa Brand Kit, viết bài tự nhiên không mùi AI, thiết kế ảnh gắn logo gốc đến cổng duyệt bài 1 chạm và tự động đăng đúng giờ.",
  primaryCta: { label: "Đăng ký tư vấn vận hành", href: "#dang-ky-tu-van" },
  secondaryCta: { label: "Trải nghiệm Cổng duyệt bài", href: "#cong-duyet-bai" },
  proofPoints: ["Brand Kit riêng từng thương hiệu", "Biên tập 2 lượt", "Báo cáo số liệu thật"],
} as const;

/** Bài đăng mẫu hiển thị trong mockup Hero. Tên thương hiệu là ví dụ minh họa. */
export const heroMockPost = {
  pageName: "Tiệm Bánh Mộc An",
  caption:
    "Mẻ bánh mì đầu tiên ra lò lúc 6 giờ sáng. Vỏ giòn, ruột mềm, bơ thơm vừa đủ. Ghé 12 Lê Lợi trước 8 giờ để lấy bánh còn ấm nhé.",
  scheduledAt: "19:00 · Thứ Năm",
  stages: [
    { key: "writing", label: "Đang viết" },
    { key: "logo", label: "Gắn logo gốc" },
    { key: "review", label: "Chờ duyệt" },
    { key: "published", label: "Đã đăng đúng giờ" },
  ],
} as const;

export const contactConfig = {
  phoneDisplay: "0909 123 456",
  phoneHref: "tel:0909123456",
  zaloUrl: "https://zalo.me/0909123456",
  messengerUrl: "https://m.me/phuckhanhdigital",
  email: "phuckhanhdigital@gmail.com",
  workingHours: "Luôn mở cửa",
  address: "177, Ngô Quyền, Phường An Xuyên, TP. Cà Mau",
} as const;
