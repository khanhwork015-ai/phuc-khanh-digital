export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const faqContent = {
  eyebrow: "Câu hỏi thường gặp",
  title: "Những điều chủ doanh nghiệp thường hỏi trước khi bắt đầu",
} as const;

export const faqItems: FaqItem[] = [
  {
    id: "no-brandkit",
    question: "Nếu doanh nghiệp chưa có Brand Kit hay bộ nhận diện thì có làm được không?",
    answer:
      "Hoàn toàn được. Trong bước Onboarding đầu tiên, đội ngũ sẽ trao đổi nhanh 20-30 phút để nắm sản phẩm, bảng giá, cách xưng hô với khách và màu sắc chủ đạo hiện có. Nếu bạn mới chỉ có file logo hoặc vài ảnh cửa hàng, chúng tôi sẽ giúp tổng hợp thành một hồ sơ Brand Kit chuẩn trước khi viết bài đầu tiên.",
  },
  {
    id: "approval-time",
    question: "Thời gian duyệt bài mỗi tuần mất bao lâu?",
    answer:
      "Thông thường chỉ mất khoảng 3-5 phút trên điện thoại. Khi có bài mới vào khung 19:00, bạn mở đường link cổng duyệt riêng, nhập mã PIN 4 số, xem bài hiển thị giống hệt trên Facebook rồi bấm Duyệt hoặc ghi chú sửa nhanh ngay tại đó.",
  },
  {
    id: "urgent-changes",
    question: "Cần sửa nội dung hoặc đổi lịch đăng đột xuất thì xử lý thế nào?",
    answer:
      "Với bài đang chờ duyệt, bạn bấm Yêu cầu chỉnh sửa và gõ trực tiếp nội dung cần đổi ngay trên cổng duyệt. Nếu có tin tức gấp, ưu đãi đột xuất hoặc cần dời giờ đăng sau khi đã duyệt, bạn nhắn thẳng vào nhóm trao đổi riêng để đội ngũ cập nhật trong ngày.",
  },
  {
    id: "data-security",
    question: "Dữ liệu hình ảnh, bảng giá và tài khoản Fanpage có được bảo mật không?",
    answer:
      "Có. Mỗi khách hàng được tách thành một hồ sơ Brand Kit và một cổng duyệt mã PIN hoàn toàn độc lập, không dùng chung dữ liệu giữa các thương hiệu. Quyền đăng bài lên Fanpage được cấp đúng phạm vi lên lịch nội dung theo chuẩn của Meta, chủ doanh nghiệp luôn giữ toàn quyền quản trị cao nhất.",
  },
  {
    id: "onboarding-leadtime",
    question: "Bao lâu thì bắt đầu lên bài đầu tiên sau khi ký hợp đồng?",
    answer:
      "Từ 3 đến 5 ngày làm việc. Ngày 1-2 là hoàn thiện Brand Kit và chốt lịch nội dung tháng; ngày 3-4 gửi bạn xem trước loạt bài mở đầu qua cổng duyệt 1 chạm; ngay khi bạn bấm Duyệt, hệ thống bắt đầu lên lịch đăng đều đặn theo kế hoạch.",
  },
];
