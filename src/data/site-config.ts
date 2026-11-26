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

export type HeroMockPostItem = {
  id: string;
  brandId: string;
  shortLogoName: string;
  pageName: string;
  caption: string;
  photoSrc: string;
  photoAlt: string;
  avatarSrc: string;
  logoSrc: string;
  scheduledAt: string;
  likes: number;
  comments: number;
  shares: number;
};

export const heroMockPosts: HeroMockPostItem[] = [
  {
    id: "hoa-sua-1",
    brandId: "hoa-sua",
    shortLogoName: "HOA SỮA",
    pageName: hoaSuaPost.pageName,
    caption: hoaSuaPost.caption,
    photoSrc: hoaSuaPost.photoSrc,
    photoAlt: hoaSuaPost.photoAlt,
    avatarSrc: hoaSuaPost.avatarSrc,
    logoSrc: hoaSuaPost.logoSrc,
    scheduledAt: "19:00 · 24/11/2026",
    likes: 128,
    comments: 24,
    shares: 6,
  },
  {
    id: "shin-aios-1",
    brandId: "shin-aios",
    shortLogoName: "SHIN AIOS",
    pageName: "SHIN AIOS",
    caption:
      "Thuê ngoài viết bài mà ký hợp đồng xong vẫn phải tự viết nháp ý chính gửi qua thì cũng mệt không kém tự làm.\n\nỞ SHIN AIOS, ngay sau khi chốt hợp đồng, đội ngũ trực tiếp thu thập Brand Kit, sản xuất bài viết, thiết kế ảnh gắn logo và gửi bạn duyệt bằng 1 chạm.\n\n#SHINAIOS #DichVuFanpage #VanHanhNoiDung",
    photoSrc: "/samples/shin-aios/post-1.jpg",
    photoAlt: "Bạn chỉ cần duyệt bài - SHIN AIOS lo trọn gói vận hành",
    avatarSrc: "/samples/shin-aios/avatar.png",
    logoSrc: "/samples/shin-aios/avatar.png",
    scheduledAt: "19:00 · 25/11/2026",
    likes: 164,
    comments: 31,
    shares: 12,
  },
  {
    id: "t2n-1",
    brandId: "t2n",
    shortLogoName: "T2N",
    pageName: "T2N - Cộng Đồng Tuyển Sinh Đại Học & Thạc Sĩ",
    caption:
      "🎯 DẠY TIẾNG ANH TRÁI NGÀNH? NÂNG BẰNG THẠC SĨ MAE ĐẠI HỌC HOA SEN NGAY!\n\n✨ Bằng chuẩn AUN-QA, xét tuyển 100% hồ sơ + bài luận không thi áp lực, lịch học linh hoạt Thứ 7 & Chủ nhật.\n\n⏰ Hạn chót nhận hồ sơ: 13/11/2026\n📞 Hotline/Zalo: 03.388.21.365",
    photoSrc: "/samples/t2n/post-1.jpg",
    photoAlt: "T2N Tuyển sinh Thạc sĩ 2026 Ngôn ngữ Anh MAE Đại học Hoa Sen",
    avatarSrc: "/samples/t2n/avatar.png",
    logoSrc: "/samples/t2n/avatar.png",
    scheduledAt: "16:31 · 11/11/2026",
    likes: 215,
    comments: 42,
    shares: 19,
  },
];

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
