export type ProcessPreview = "brandkit" | "calendar" | "editing" | "review" | "report";

export type ProcessStep = {
  number: string;
  title: string;
  body: string;
  points: string[];
  preview: ProcessPreview;
};

export const processContent = {
  eyebrow: "Quy trình",
  title: "Quy trình 5 bước khép kín, vận hành độc lập cho từng thương hiệu",
  description:
    "Mỗi thương hiệu có hồ sơ riêng, lịch riêng và người phụ trách riêng. Bạn chỉ cần duyệt bài, phần còn lại đội ngũ lo.",
} as const;

export const processSteps: ProcessStep[] = [
  {
    number: "01",
    title: "Onboarding và chuẩn hóa Brand Kit",
    body: "Tìm hiểu sản phẩm, khách hàng và cách bạn đang trò chuyện với họ. Chưa có bộ nhận diện thì đội ngũ dựng cùng bạn từ đầu.",
    points: ["Chốt bảng giá và cách xưng hô", "Danh sách từ cần tránh", "Nhận file logo gốc PNG/SVG"],
    preview: "brandkit",
  },
  {
    number: "02",
    title: "Lập lịch tháng theo tỷ lệ 60 / 25 / 15",
    body: "Lịch đăng cả tháng được chốt trước, ảnh và video Reels xen kẽ để trang không bị đơn điệu.",
    points: ["60% bài chia sẻ kiến thức hữu ích", "25% bài bán hàng", "15% bài tương tác và kể chuyện thương hiệu"],
    preview: "calendar",
  },
  {
    number: "03",
    title: "Biên tập 2 lượt và ảnh đời thực",
    body: "Lượt đầu viết đủ dữ kiện. Lượt hai gọt lại câu chữ cho tự nhiên, đọc mượt trên điện thoại.",
    points: ["Giữ nguyên giá, địa chỉ, ưu đãi thật", "Ảnh ánh sáng tự nhiên, chữ tiếng Việt đúng dấu", "Logo gốc đặt trong vùng an toàn"],
    preview: "editing",
  },
  {
    number: "04",
    title: "Kiểm duyệt 4 tiêu chí và gửi duyệt 1 chạm",
    body: "Từng bài được rà trên khung nhìn điện thoại trước khi tới tay bạn. Bài đạt chuẩn vào cổng duyệt riêng lúc 19:00 mỗi khi có bài chờ.",
    points: ["Chính tả, hình ảnh, logo, dữ kiện", "Xem trước giống hệt bài thật", "Duyệt hoặc góp ý chỉ với 1 chạm"],
    preview: "review",
  },
  {
    number: "05",
    title: "Đăng đúng giờ và báo cáo tuần",
    body: "Bài đã duyệt được đăng đúng lịch hẹn. Sáng Chủ nhật bạn nhận số liệu thật của tuần kèm hướng điều chỉnh cho tuần sau.",
    points: ["Định dạng sạch trước khi đăng", "Số liệu lấy trực tiếp từ Fanpage", "Tối ưu khung giờ theo kết quả thật"],
    preview: "report",
  },
];
