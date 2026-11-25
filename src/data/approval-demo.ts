export const approvalContent = {
  eyebrow: "Cổng duyệt bài",
  title: "Duyệt bài nhanh như lướt Facebook, bảo mật bằng mã PIN riêng",
  description:
    "Mỗi thương hiệu có một đường link duyệt bài riêng. Bạn xem bài giống hệt lúc lên trang, bấm Duyệt hoặc để lại góp ý. Thử ngay với mã PIN demo.",
  bullets: [
    "Không cần cài ứng dụng, mở được trên mọi điện thoại",
    "Xem trước đúng giao diện bài đăng thật",
    "Góp ý ngay trên bài, đội ngũ sửa rồi gửi lại",
  ],
  demoPin: "2026",
  portalUrl: "duyet.phuckhanhdigital.vn/moc-an",
} as const;

export const approvalStatuses = [
  "Nháp",
  "Chờ duyệt",
  "Chờ khách duyệt",
  "Đã duyệt",
  "Chờ đăng",
  "Đã đăng",
] as const;

/** Bài mẫu trong cổng duyệt. Thương hiệu "Mộc An" là ví dụ minh họa. */
export const approvalPost = {
  pageName: "Tiệm Bánh Mộc An",
  initials: "MA",
  caption:
    "Cuối tuần này tiệm mở thêm mẻ bánh lúc 15:00. Mua từ 5 ổ được tặng 1 hũ bơ tỏi nhà làm. Áp dụng thứ Bảy và Chủ nhật, tại 12 Lê Lợi.",
  photoTitle: "Mẻ bánh chiều",
  photoSub: "Ra lò 15:00 · 12 Lê Lợi",
  scheduledLabel: "19:00 · Thứ Năm",
  pillar: "Bài bán hàng",
} as const;
