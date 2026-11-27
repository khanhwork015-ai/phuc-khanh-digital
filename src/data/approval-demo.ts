import { hoaSuaPost } from "./site-config";

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
  portalUrl: "duyet.phuckhanh.digital/hoa-sua",
} as const;

export const approvalStatuses = [
  "Nháp",
  "Chờ duyệt",
  "Chờ khách duyệt",
  "Đã duyệt",
  "Chờ đăng",
  "Đã đăng",
] as const;

export const approvalPost = {
  ...hoaSuaPost,
  scheduledLabel: "19:00 · 24/11/2026",
  pillar: "Thông báo hoạt động",
} as const;
