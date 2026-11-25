# Thiết kế: Hiệu ứng cuộn + Chuông PK 3D ở Hero

**Ngày:** 25/11/2026
**Trạng thái:** Đã duyệt (25/11/2026)
**Phạm vi:** Nâng cấp chuyển động cho landing page hiện có (Next.js 15, Tailwind v4, motion, lenis). Không đổi nội dung chữ, bố cục section hay chức năng.

---

## 1. Mục đích

Trang hiện tại sạch và đúng chức năng nhưng "khá đơn giản", Hero chưa có gì đặc sắc. Anh/chị muốn trang có cảm giác hiện đại, mượt, có chiều sâu (tham khảo lusion.co, igloo.inc), nhưng **nhẹ nhàng, một ít hiệu ứng cho đẹp**, không biến thành trang trình diễn 3D nặng.

Khách của trang là chủ SME, phần lớn xem trên điện thoại Android tầm trung, mục tiêu cuối là điền form tư vấn. Hiệu ứng phải phục vụ ấn tượng đầu và cảm giác chuyên nghiệp, không được cản việc đọc và điền form.

## 2. Mục tiêu, không làm, tuyệt đối tránh

**Mục tiêu**
- Hero có một điểm nhấn thật sự: quả chuông PK vàng kim dạng 3D, xoay chậm, phản ứng theo chuột và theo cuộn.
- Cả trang có chuyển động theo cuộn: parallax, phóng to/thu nhỏ theo cuộn, một đoạn cuộn ngang.
- Cảm giác mượt 60fps trên máy tính.

**Không làm**
- Không đổi nội dung chữ, thứ tự section, bảng giá, form, API.
- Không làm 3D toàn trang hay chuyển cảnh WebGL giữa các section như lusion.co.
- Không thêm âm thanh, con trỏ chuột tùy biến, màn hình loading.

**Tuyệt đối tránh** (dù chạy được vẫn coi là hỏng)
- Điện thoại bị giật, nóng máy, hoặc phải chờ 3D tải mới thấy nội dung.
- Chữ khó đọc vì đang chuyển động, hoặc cuộn bị "chiếm quyền" khiến khó tới form.
- Điểm Lighthouse mobile tụt dưới mức hiện tại (78 đến 80), hoặc desktop tụt dưới 95.
- Hiệu ứng vẫn chạy khi người dùng đã bật "giảm chuyển động".

## 3. Ràng buộc

- Giữ design tokens hiện có (nền `#09090B`, vàng kim `#E9BE57`...). Không gradient tím/hồng, không `rounded-3xl`, không `scale-105` trên thẻ lớn.
- H1 ở Hero là phần tử LCP: **không được ẩn H1 bằng opacity hay để JavaScript quyết định lúc hiện** (bài học từ Sprint 4).
- Chỉ animate `transform` và `opacity`.
- Tôn trọng `prefers-reduced-motion`: tắt toàn bộ hiệu ứng theo cuộn, tắt 3D, hiện ảnh tĩnh.
- Chữ trên logo 3D phải đúng logo gốc (dựng từ `public/brand/logo-mark.svg`, không tự vẽ lại).

## 4. Các phương án đã cân nhắc

| | Mô tả | Được | Mất |
|---|---|---|---|
| A | Chỉ hiệu ứng cuộn bằng motion đang có, "3D" là nghiêng phối cảnh CSS | Không tăng JS, giữ điểm mobile | Hero vẫn chưa có điểm nhấn thật sự |
| **B (đã chọn)** | A + chuông PK 3D bằng three.js ở Hero, chỉ tải trên máy tính | Hero nổi bật, gần chất Lusion | Thêm khoảng 150-180 kB JS nén (chỉ máy tính, tải sau khi trang hiện), công dựng mô hình |
| C | 3D toàn trang kiểu lusion.co / igloo.inc | Ấn tượng tối đa | Nặng nhiều MB, giật trên điện thoại SME, trái ý "nhẹ nhàng" |

Anh/chị chọn **B**.

## 5. Thiết kế chi tiết

### 5.1. Nền tảng chuyển động
- Dùng `useScroll` / `useTransform` / `useSpring` của thư viện `motion` đã có. **Không cài GSAP.**
- **Cuộn mượt cho toàn trang** (anh/chị yêu cầu thêm):
  - Máy tính và laptop (chuột, touchpad): Lenis bật cho cả trang, quán tính `lerp` khoảng 0,08 đến 0,1. Mọi kiểu cuộn đều đi qua Lenis: con lăn, touchpad, phím mũi tên, Page Down, Space, và bấm link trên menu.
  - Điện thoại và máy tính bảng: **cũng bật Lenis** (anh/chị chọn), dùng chế độ cảm ứng `syncTouch` để cú vuốt có quán tính mượt giống máy tính. Các hiệu ứng gắn với cuộn vẫn có lò xo (`useSpring`).
    - Rủi ro đã nêu và anh/chị chấp nhận: trên Android tầm trung có thể thấy "trễ tay" nhẹ hoặc thỉnh thoảng khựng, tốn pin hơn vì vòng lặp chạy liên tục.
    - Biện pháp giảm rủi ro: quán tính cảm ứng nhẹ hơn máy tính (`syncTouchLerp` khoảng 0,075, `touchInertiaExponent` giữ thấp); Lenis khởi động sau khi trang đã hiện; vòng lặp tự nghỉ khi trang đứng yên; các vùng tự cuộn bên trong (ô góp ý, menu mobile) được loại khỏi Lenis.
    - Có một công tắc cấu hình duy nhất (ví dụ `SMOOTH_SCROLL_TOUCH` trong `src/lib/theme.ts`) để tắt cuộn mượt trên cảm ứng bằng một dòng nếu thực tế thấy không ổn.
    - Khi làm xong, người làm thử trên khung điện thoại (375px, chế độ cảm ứng) và báo lại cảm giác thực tế cùng điểm Lighthouse mobile trước khi chốt. Nếu điểm mobile tụt dưới 78 vì riêng phần này thì báo anh/chị quyết định giữ hay tắt.
  - Bấm link neo (menu, nút CTA) thì trượt mượt tới đúng mục trên mọi thiết bị, có trừ chiều cao Navbar.
  - Bật "giảm chuyển động" thì tắt cuộn mượt, nhảy thẳng tới mục.
  - Các hiệu ứng cuộn đọc vị trí từ `useScroll` nên tự đồng bộ với Lenis.
- Tạo một hook dùng chung `useMotionAllowed()` trả về `false` khi bật giảm chuyển động hoặc màn hình nhỏ hơn `lg` (1024px). Mọi hiệu ứng cuộn "nặng" (cuộn ngang, nghiêng theo chuột, 3D) đi qua hook này.

### 5.2. Thanh tiến trình cuộn
- Dải vàng 2px sát mép dưới Navbar, dài theo phần trăm đã cuộn (`scaleX` theo `scrollYProgress`, có `useSpring`).

### 5.3. Hero (điểm nhấn chính)

Bố cục giữ nguyên: chữ bên trái 55%, mockup bên phải 45%.

```
┌──────────────────────────────────────────────────────────────┐
│ [badge]                                  ✦ chuông PK 3D      │
│ Giữ trọn chất riêng                        (sau mockup,      │
│ thương hiệu trên từng      ┌───────────┐    lệch lên phải,   │
│ bài đăng Fanpage.          │  mockup   │    xoay chậm)       │
│                            │ bài đăng  │ ← nghiêng theo chuột│
│ [Đăng ký] [Trải nghiệm]    │ (kính)    │                     │
│                            └───────────┘                     │
└──────────────────────────────────────────────────────────────┘
   Khi cuộn xuống: chữ trôi chậm, mockup trôi nhanh hơn,
   chuông xoay thêm và lùi ra xa, cả Hero thu nhỏ 1 → 0,94 và mờ dần.
```

- **Chuông PK 3D** (máy tính):
  - Dựng bằng three.js thuần (không dùng React Three Fiber, để nhẹ hơn), từ 12 hình có tô màu trong `logo-mark.svg`, bằng `SVGLoader` + `ExtrudeGeometry`. Bỏ 3 nét viền trang trí và 1 nét phát sáng của SVG.
  - Chất liệu kim loại vàng (`MeshStandardMaterial`, metalness cao), ánh sáng môi trường `RoomEnvironment`, nền trong suốt.
  - Hai chữ P và K đùn dày hơn, nhô ra trước thân chuông để có chiều sâu.
  - Chuyển động: tự xoay lắc nhẹ quanh trục đứng; nghiêng theo vị trí chuột (có quán tính); khi cuộn thì xoay thêm khoảng 30 độ và lùi xa dần.
  - Vị trí: phía sau mockup, lệch lên trên bên phải, kích thước khoảng 60% chiều cao Hero.
- **Ảnh tĩnh thay thế** (điện thoại, máy không có WebGL, bật giảm chuyển động, hoặc trong lúc 3D đang tải): `logo-mark.svg` hiện ở đúng vị trí đó, có quầng sáng vàng mờ phía sau. Ảnh tĩnh hiện ngay từ HTML, 3D tải xong thì mờ dần chồng lên, nên không có khoảng trống.
- **Điều kiện tải 3D:** máy có chuột, rộng từ 1024px, có WebGL, không bật giảm chuyển động. Tải bằng `import()` động **sau khi trang đã hiện và trình duyệt rảnh**, nên không ảnh hưởng thời gian hiện Hero.
- **Mockup bài đăng:** nghiêng phối cảnh theo chuột tối đa khoảng 6 độ (CSS `perspective` + `rotateX/Y`, có quán tính). Chỉ trên máy tính.
- **Chữ tiêu đề:** giữ animation CSS hiện tại (H1 chỉ trượt, không ẩn). Badge, mô tả và nút giữ hiệu ứng hiện dần như cũ.
- **Khi cuộn qua Hero:** chữ và mockup trôi lên ở hai tốc độ khác nhau (parallax); toàn khối Hero thu nhỏ 1 → 0,94 và độ đậm 1 → 0,3.

### 5.4. Các section khác (hiệu ứng nhẹ)

| Section | Hiệu ứng |
|---|---|
| Nỗi đau SME | 3 thẻ trôi lên với tốc độ hơi khác nhau khi cuộn (parallax nhẹ, lệch tối đa 24px) |
| Quy trình 5 bước | Giữ nguyên cơ chế sticky. Khung xem trước phóng nhẹ 0,97 → 1 mỗi lần đổi bước |
| Cổng duyệt bài | Khung demo phóng to theo cuộn 0,9 → 1 và nghiêng từ 8 độ về 0 (như màn hình dựng thẳng lên) |
| Sản phẩm mẫu | Giữ nguyên |
| **Cam kết 4 chốt chặn** | **Cuộn ngang:** trên máy tính, section được ghim lại, 4 thẻ trượt ngang lần lượt khi cuộn dọc, có bộ đếm "01 / 04". Trên điện thoại giữ dạng xếp dọc như hiện tại |
| Bảng giá | Gói "Khuyên dùng" nghiêng nhẹ theo chuột khi rê vào |
| Tiêu đề mọi section | Đường gạch nhỏ cạnh nhãn (`01 ── VẤN ĐỀ`) dài ra khi section xuất hiện |

Lý do chọn section Cam kết để cuộn ngang: 4 thẻ cùng kích thước, đọc tuần tự hợp lý ("4 chốt chặn trước khi bài lên trang"), và không chứa form hay nút quan trọng, nên việc ghim không cản đường tới form. Sản phẩm mẫu đang có 2 tab nên không hợp để ghim.

### 5.5. Hiệu năng

- three.js nằm trong một chunk riêng, **không bao giờ tải trên điện thoại**.
- Vòng lặp vẽ 3D: dừng khi Hero ra khỏi màn hình hoặc tab bị ẩn; tỷ lệ điểm ảnh tối đa 1,5; giải phóng geometry, material và renderer khi rời trang.
- Khi 3D đang chạy thì canvas lưới chấm nền Hero chỉ vẽ một khung tĩnh, để không có hai vòng lặp cùng chạy.
- Hiệu ứng cuộn dùng `useScroll` (một bộ lắng nghe chung), chỉ đổi `transform` và `opacity`.

## 6. Kiểm tra trước khi giao

- `tsc`, `lint`, `build` sạch.
- Lighthouse 3 lần trên bản production: mobile Performance không thấp hơn mức hiện tại (78), desktop ≥ 95. Accessibility, Best Practices, SEO vẫn 100.
- Xác nhận bằng network: điện thoại (375px) không tải chunk three.js.
- Xem trên 375 / 768 / 1440px, có chụp ảnh: không tràn ngang, đoạn cuộn ngang vào và ra trơn tru.
- Bật giả lập giảm chuyển động: không còn hiệu ứng cuộn, Hero hiện ảnh tĩnh.
- Chạy lại toàn bộ test chức năng cũ (cổng duyệt, form, FAQ, menu) để chắc không hỏng gì.

## 7. Phần để người làm tự quyết

- Con số chính xác: độ dài đoạn cuộn ngang, tốc độ parallax, góc xoay, độ dày đùn 3D, cường độ ánh sáng. Chỉnh bằng mắt cho đẹp, trong giới hạn đã nêu ở mục 5.
- Cách sắp tên file và chia component, miễn theo cấu trúc hiện có (`components/motion/`, `components/modules/`).

## 8. Các quyết định tôi tự đưa ra (anh/chị kiểm tra giúp)

1. Dùng three.js thuần thay vì React Three Fiber: nhẹ hơn khoảng 40 kB, cảnh chỉ có một vật thể nên không cần.
2. Đặt chuông phía sau mockup thay vì thay thế mockup: giữ được phần minh họa dịch vụ, chuông làm nền tạo chiều sâu.
3. Cuộn ngang đặt ở section Cam kết (lý do ở mục 5.4).
4. Điện thoại không có 3D, chỉ có ảnh tĩnh và hiệu ứng cuộn nhẹ (parallax, phóng to khung cổng duyệt). Cuộn mượt thì có trên cả điện thoại theo yêu cầu của anh/chị (mục 5.1).
