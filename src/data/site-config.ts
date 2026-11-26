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

export const hoaSuaPost = {
  pageName: "HOA SỮA - Coffee & tea",
  caption:
    "📢 THÔNG BÁO HOẠT ĐỘNG NGÀY LỄ 24/11\n\nNhân dịp Ngày Văn hóa Việt Nam – 24/11, Hoa Sữa Coffee & Tea vẫn hoạt động bình thường để phục vụ Quý khách.\n\n🌿 Kính chúc Quý khách có một ngày lễ thật vui vẻ, ý nghĩa bên gia đình và những người thân yêu.\n\n☕ Hoa Sữa luôn sẵn sàng đón tiếp và phục vụ Quý khách!",
  photoSrc: "/samples/hoa-sua/culture-day.webp",
  photoAlt:
    "Hoa Sữa Coffee & Tea thông báo hoạt động ngày 24/11/2026, tại 137 Đinh Tiên Hoàng, Phường An Xuyên",
  avatarSrc: "/samples/hoa-sua/avatar.png",
  logoSrc: "/samples/hoa-sua/logo.png",
  address: "137 Đinh Tiên Hoàng, Phường An Xuyên",
} as const;

export const heroMockPost = {
  ...hoaSuaPost,
  scheduledAt: "19:00 · 24/11/2026",
  stages: [
    { key: "writing", label: "Đang viết" },
    { key: "logo", label: "Gắn logo gốc" },
    { key: "review", label: "Chờ duyệt" },
    { key: "published", label: "Đã đăng đúng giờ" },
  ],
} as const;

export const contactConfig = {
  phoneDisplay: "0886 684 778",
  phoneHref: "tel:0886684778",
  zaloUrl: "https://zalo.me/0886684778",
  messengerUrl: "https://m.me/61597044384950",
  email: "phuckhanhdigital@gmail.com",
  workingHours: "Luôn mở cửa",
  address: "177, Ngô Quyền, Phường An Xuyên, TP. Cà Mau",
} as const;
