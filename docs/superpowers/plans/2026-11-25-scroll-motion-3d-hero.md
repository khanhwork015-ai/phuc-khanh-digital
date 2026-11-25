# Hiệu ứng cuộn + Chuông PK 3D: Kế hoạch thực hiện

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm cuộn mượt toàn trang, hiệu ứng theo cuộn (parallax, phóng/thu, cuộn ngang) và quả chuông PK 3D ở Hero, mà không làm tụt điểm Lighthouse.

**Architecture:** Một module thuần `motion-env.ts` quyết định thiết bị được phép chạy gì (cuộn mượt, hiệu ứng nặng, 3D), mọi component hỏi module này. Hiệu ứng cuộn dùng `useScroll`/`useTransform`/`useSpring` của `motion` có sẵn. Cảnh 3D là một class three.js thuần, nằm trong chunk riêng, chỉ `import()` trên máy tính sau khi trang đã hiện; ảnh SVG tĩnh luôn có sẵn bên dưới.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind v4, motion (đã có), lenis (đã có), three.js 0.187 (thêm mới). Test thuần bằng `node --test` (Node 26 chạy TypeScript trực tiếp).

**Spec:** `docs/superpowers/specs/2026-11-25-scroll-motion-3d-hero-design.md`

## Global Constraints

- Không đổi nội dung chữ, thứ tự section, form, API.
- Chỉ animate `transform` và `opacity`. Không gradient tím/hồng, không `rounded-3xl`, không `scale-105` trên thẻ lớn.
- H1 Hero là phần tử LCP: không ẩn bằng opacity, không để JS quyết định lúc hiện.
- `prefers-reduced-motion: reduce` → tắt cuộn mượt, tắt hiệu ứng cuộn, không tải 3D, hiện ảnh tĩnh.
- 3D chỉ tải khi: có chuột (`(hover: hover) and (pointer: fine)`), rộng ≥ 1024px, có WebGL, không giảm chuyển động.
- Lenis: máy tính `lerp` 0,08 đến 0,1; cảm ứng bật `syncTouch`, `syncTouchLerp` khoảng 0,075; có công tắc `SMOOTH_SCROLL_TOUCH` trong `src/lib/theme.ts`.
- Lighthouse bản production: mobile Performance ≥ 78, desktop ≥ 95; Accessibility, Best Practices, SEO = 100.
- Không cài GSAP, không dùng React Three Fiber.
- Dự án chưa có git: mỗi task kết thúc bằng bước **Kiểm tra** (tsc, lint, build hoặc test) thay cho commit.

## Review Focus

1. **Tải lại trang khi đang ở giữa trang** (trình duyệt tự khôi phục vị trí cuộn): Hero thu nhỏ/mờ và các giá trị theo cuộn phải đúng ngay, không nhảy. Test ở Task 2.
2. **Bấm menu "Gói vận hành" hoặc "Nhận tư vấn"** khi đoạn cuộn ngang nằm giữa đường: phải dừng đúng mục đích, không kẹt trong đoạn ghim. Test ở Task 5.
3. **Ô góp ý trong cổng duyệt và menu điện thoại khi bật cuộn mượt cảm ứng**: phải cuộn và gõ bình thường, Lenis không nuốt thao tác. Test ở Task 1.
4. **Chunk three.js tải lỗi, hoặc WebGL bị mất (context lost)**: ảnh chuông tĩnh vẫn hiện, không có lỗi đỏ trong console, trang vẫn dùng được. Test ở Task 3.
5. **Kéo cửa sổ qua lại mốc 1024px**: đoạn cuộn ngang chuyển giữa dạng ghim và dạng xếp dọc không vỡ bố cục, không tràn ngang; 3D đã tải không bị lặp hai lần. Test ở Task 5 và Task 3.

---

## File Structure

| File | Việc | Trách nhiệm |
|---|---|---|
| `src/lib/motion-env.ts` | Tạo | Hàm thuần: đọc môi trường, quyết định cuộn mượt / hiệu ứng nặng / 3D, sinh options Lenis |
| `src/lib/motion-env.test.ts` | Tạo | Test thuần cho `motion-env.ts` |
| `src/lib/theme.ts` | Sửa | Thêm `SMOOTH_SCROLL_TOUCH`, hằng số Lenis |
| `src/components/motion/SmoothScrollProvider.tsx` | Sửa | Dùng `getLenisOptions`, bật Lenis cho cả cảm ứng |
| `src/components/motion/useHeavyMotion.ts` | Tạo | Hook `useHeavyMotion(): boolean`, nghe đổi kích thước |
| `src/components/motion/ScrollProgress.tsx` | Tạo | Thanh tiến trình cuộn vàng |
| `src/components/modules/HeroSection.tsx` | Sửa | Bọc phần cuộn (parallax, thu nhỏ/mờ), đặt chuông |
| `src/components/modules/hero/HeroScrollStage.tsx` | Tạo | Client: parallax chữ/mockup, thu nhỏ Hero theo cuộn |
| `src/components/modules/hero/TiltCard.tsx` | Tạo | Client: nghiêng phối cảnh theo chuột (dùng cho mockup và gói Khuyên dùng) |
| `src/components/modules/hero/HeroBell.tsx` | Tạo | Client: ảnh chuông tĩnh + tải 3D có điều kiện |
| `src/components/three/bell-shapes.ts` | Tạo | Hàm thuần: lọc SVG logo thành các hình đùn được |
| `src/components/three/bell-shapes.test.ts` | Tạo | Test thuần cho `bell-shapes.ts` |
| `src/components/three/bell-scene.ts` | Tạo | Class three.js: dựng, vẽ, tạm dừng, giải phóng |
| `src/components/motion/AmbientShaderCanvas.tsx` | Sửa | Nhận prop `paused` để chỉ vẽ khung tĩnh khi 3D chạy |
| `src/components/motion/ScrollScale.tsx` | Tạo | Client: phóng/nghiêng phần tử theo cuộn (khung cổng duyệt) |
| `src/components/motion/Parallax.tsx` | Tạo | Client: dịch y theo cuộn (thẻ Nỗi đau) |
| `src/components/ui/SectionHeader.tsx` | Sửa | Gạch nhãn dài ra khi xuất hiện |
| `src/components/modules/QualityGuardrailsSection.tsx` | Sửa | Cuộn ngang ghim trên máy tính |
| `src/components/modules/PainPointsSection.tsx`, `ApprovalPortalDemo.tsx`, `ProcessStepperSection.tsx`, `PricingFaqSection.tsx` | Sửa | Gắn hiệu ứng nhẹ |
| `package.json` | Sửa | Thêm `three`, `@types/three`, script `test` |

---

### Task 1: Môi trường chuyển động + cuộn mượt toàn trang + thanh tiến trình

**Files:**
- Create: `src/lib/motion-env.ts`, `src/lib/motion-env.test.ts`, `src/components/motion/useHeavyMotion.ts`, `src/components/motion/ScrollProgress.tsx`
- Modify: `src/lib/theme.ts`, `src/components/motion/SmoothScrollProvider.tsx`, `src/components/modules/Navbar.tsx` (đặt `ScrollProgress`), `package.json`

**Interfaces:**
- Produces:
  - `type MotionEnv = { reducedMotion: boolean; finePointer: boolean; width: number; webgl: boolean }`
  - `readMotionEnv(): MotionEnv` (chỉ gọi ở client; `webgl` thử `canvas.getContext("webgl2") ?? getContext("webgl")`)
  - `allowsHeavyMotion(env: MotionEnv): boolean` → `!reducedMotion && width >= 1024`
  - `canUse3D(env: MotionEnv): boolean` → `finePointer && width >= 1024 && webgl && !reducedMotion`
  - `getLenisOptions(env: MotionEnv, touchEnabled: boolean): LenisOptions | null` → `null` nếu `reducedMotion`, hoặc nếu `!finePointer && !touchEnabled`
  - `useHeavyMotion(): boolean`: `false` khi SSR và lần render đầu; cập nhật theo `resize` và đổi media query
  - theme: `SMOOTH_SCROLL_TOUCH = true`, `LENIS_DESKTOP_LERP = 0.09`, `LENIS_TOUCH_LERP = 0.075`

- [ ] **Step 1: Thêm script test** vào `package.json`: `"test": "node --test \"src/**/*.test.ts\""`. Thêm `"allowImportingTsExtensions": true` vào `tsconfig.json` (đã có `noEmit`) để file test import được `./motion-env.ts`.

- [ ] **Step 2: Viết test thất bại** `src/lib/motion-env.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { allowsHeavyMotion, canUse3D, getLenisOptions, type MotionEnv } from "./motion-env.ts";

const desktop: MotionEnv = { reducedMotion: false, finePointer: true, width: 1440, webgl: true };
const phone: MotionEnv = { reducedMotion: false, finePointer: false, width: 375, webgl: true };

test("3D chỉ bật trên máy tính đủ điều kiện", () => {
  assert.equal(canUse3D(desktop), true);
  assert.equal(canUse3D(phone), false);
  assert.equal(canUse3D({ ...desktop, width: 1023 }), false);
  assert.equal(canUse3D({ ...desktop, webgl: false }), false);
  assert.equal(canUse3D({ ...desktop, reducedMotion: true }), false);
});

test("hiệu ứng nặng tắt khi giảm chuyển động hoặc màn hẹp", () => {
  assert.equal(allowsHeavyMotion(desktop), true);
  assert.equal(allowsHeavyMotion({ ...desktop, reducedMotion: true }), false);
  assert.equal(allowsHeavyMotion({ ...desktop, width: 800 }), false);
});

test("Lenis: máy tính lerp 0.09, cảm ứng syncTouch, giảm chuyển động thì tắt", () => {
  assert.equal(getLenisOptions(desktop, true)?.lerp, 0.09);
  const touch = getLenisOptions(phone, true);
  assert.equal(touch?.syncTouch, true);
  assert.equal(touch?.syncTouchLerp, 0.075);
  assert.equal(getLenisOptions(phone, false), null);
  assert.equal(getLenisOptions({ ...desktop, reducedMotion: true }, true), null);
});
```

- [ ] **Step 3: Chạy test, xác nhận thất bại.** Run: `npm test`. Expected: FAIL, không tìm thấy `./motion-env.ts`.

- [ ] **Step 4: Viết `src/lib/motion-env.ts`** theo các chữ ký ở trên. Options Lenis luôn có `anchors: { offset: -72 }`, `smoothWheel: true`; khi cảm ứng thêm `syncTouch: true`, `syncTouchLerp: LENIS_TOUCH_LERP`, `touchInertiaExponent: 1.5`. File này chỉ import `import type { LenisOptions } from "lenis"` (bắt buộc `import type` để Node bỏ đi khi chạy test) và hằng số (viết hằng số ngay trong file và để `theme.ts` re-export, vì test chạy bằng Node không phân giải được alias `@/`).

- [ ] **Step 5: Chạy test, xác nhận đạt.** Run: `npm test`. Expected: 3 test pass.

- [ ] **Step 6: Sửa `SmoothScrollProvider.tsx`** để tạo Lenis từ `getLenisOptions(readMotionEnv(), SMOOTH_SCROLL_TOUCH)`. Giữ nguyên việc khởi tạo khi trình duyệt rảnh và hàm `scrollTo`. Vòng `requestAnimationFrame` chỉ gọi `lenis.raf` (Lenis tự nghỉ khi đứng yên). Thêm `data-lenis-prevent` cho khung menu mobile trong `Navbar.tsx`.

- [ ] **Step 7: Viết `useHeavyMotion.ts` và `ScrollProgress.tsx`.** Thanh tiến trình: `m.div` cao 2px, `bg-accent`, `origin-left`, `scaleX` = `useSpring(scrollYProgress, { stiffness: 200, damping: 40 })`, đặt sát mép dưới header; ẩn khi giảm chuyển động.

- [ ] **Step 8: Kiểm tra trên trình duyệt (dev).**
  - Máy tính: cuộn bằng con lăn có quán tính; thanh vàng chạy theo cuộn.
  - Khung 375px chế độ cảm ứng: vuốt có quán tính.
  - **Review Focus 3:** mở cổng duyệt → Yêu cầu chỉnh sửa → gõ 6 dòng vào ô góp ý, cuộn được bên trong ô. Mở menu điện thoại, bấm "Gói vận hành": tới đúng mục.

- [ ] **Step 9: Kiểm tra.** Run: `npx tsc --noEmit && npm run lint && npm test`. Expected: không lỗi, 3 test pass.

---

### Task 2: Hero theo cuộn + nghiêng mockup

**Files:**
- Create: `src/components/modules/hero/HeroScrollStage.tsx`, `src/components/modules/hero/TiltCard.tsx`
- Modify: `src/components/modules/HeroSection.tsx`

**Interfaces:**
- Consumes: `useHeavyMotion()` (Task 1)
- Produces:
  - `HeroScrollStage({ text, visual, bell }: { text: ReactNode; visual: ReactNode; bell: ReactNode })`: client, giữ lưới 55/45 hiện tại
  - `TiltCard({ children, maxDeg = 6, className }: { children: ReactNode; maxDeg?: number; className?: string })`: chỉ nghiêng khi `useHeavyMotion()` là `true`

- [ ] **Step 1: Viết `HeroScrollStage`.** `useScroll({ target: sectionRef, offset: ["start start", "end start"] })`. Giá trị theo cuộn (đều qua `useSpring` nhẹ):
  - khối chữ `y` 0 → −60px
  - khối mockup `y` 0 → −140px
  - cả stage `scale` 1 → 0,94 và `opacity` 1 → 0,3

  `HeroSection` vẫn là server component và truyền khối chữ (giữ class `hero-fade-up` / `hero-rise`) vào prop `text`. **H1 không nằm trong phần tử nào có opacity khởi đầu < 1.**

- [ ] **Step 2: Viết `TiltCard`** (`perspective: 1000px`; `rotateX`/`rotateY` theo vị trí chuột trong thẻ, tối đa `maxDeg`, `useSpring` stiffness 150 damping 18; rời chuột thì về 0) và bọc `<HeroPostMockup />`.

- [ ] **Step 3: Để chỗ cho chuông.** Prop `bell` render ở lớp nằm sau mockup: `absolute`, lệch trên phải, cao khoảng 60% Hero, `-z-10`, `pointer-events-none`. Task này truyền tạm `null`; Task 3 điền vào.

- [ ] **Step 4: Kiểm tra trên trình duyệt (dev, 1440px).** Cuộn chậm qua Hero: chữ và mockup trôi khác tốc độ, Hero thu nhỏ và mờ dần; rê chuột lên mockup thì nghiêng. Ở 375px: không nghiêng, không tràn ngang (`document.documentElement.scrollWidth <= innerWidth`).

- [ ] **Step 5 (Review Focus 1): Tải lại giữa trang.** Cuộn tới mục Quy trình, bấm F5. Expected: sau khi tải, Hero (cuộn lên xem) ở đúng trạng thái theo vị trí cuộn, không nhảy giật; console không có lỗi hydration.

- [ ] **Step 6: Kiểm tra.** Run: `npx tsc --noEmit && npm run lint && npm test`. Expected: không lỗi.

---

### Task 3: Chuông PK 3D

**Files:**
- Create: `src/components/three/bell-shapes.ts`, `src/components/three/bell-shapes.test.ts`, `src/components/three/bell-scene.ts`, `src/components/modules/hero/HeroBell.tsx`
- Modify: `src/components/motion/AmbientShaderCanvas.tsx`, `src/components/modules/HeroSection.tsx`, `package.json`

**Interfaces:**
- Consumes: `readMotionEnv()`, `canUse3D()` (Task 1); prop `bell` của `HeroScrollStage` (Task 2)
- Produces:
  - `extractBellShapes(svgText: string): { svg: string; letterIds: string[] }`: trả SVG rút gọn chỉ còn các `<path>` có tô màu, bỏ `<defs>`, bỏ path `fill="none"` và path có `filter=`, thay mọi `fill="url(#...)"` bằng `fill="#E9BE57"`, giữ `id="letter-p"` và `id="letter-k"`
  - `class BellScene { constructor(canvas: HTMLCanvasElement, svgText: string); setPointer(x: number, y: number): void /* -1..1 */; setScroll(progress: number): void /* 0..1 */; start(): void; stop(): void; dispose(): void; onContextLost?: () => void }`
  - `AmbientShaderCanvas` thêm prop `paused?: boolean` (true → dừng vòng lặp, giữ khung hiện tại)
  - `HeroBell(): JSX.Element`: luôn render `<img src="/brand/logo-mark.svg">` kèm quầng sáng; khi `canUse3D` thì tải 3D và hiện canvas chồng lên

- [ ] **Step 1: Cài thư viện.** Run: `npm i three@0.187 && npm i -D @types/three`. Expected: cài xong, `package.json` có `three`.

- [ ] **Step 2: Viết test thất bại** `src/components/three/bell-shapes.test.ts`: đọc `public/brand/logo-mark.svg` bằng `fs`, gọi `extractBellShapes`, rồi assert:
  - số `<path` trong `svg` trả về đúng **12**
  - không còn chuỗi `url(#`, `fill="none"`, `filter=`
  - `letterIds` bằng `["letter-p", "letter-k"]`

- [ ] **Step 3: Chạy test, xác nhận thất bại.** Run: `npm test`. Expected: FAIL ở test bell-shapes.

- [ ] **Step 4: Viết `bell-shapes.ts`** bằng xử lý chuỗi/regex (Node không có `DOMParser`). Giữ nguyên `viewBox` gốc. Các path trong nhóm `<g fill="url(#gold)">` (4 hình vuông) phải nhận `fill="#E9BE57"` trên chính path.

- [ ] **Step 5: Chạy test, xác nhận đạt.** Run: `npm test`. Expected: tất cả test pass.

- [ ] **Step 6: Viết `bell-scene.ts`.**
  - `SVGLoader().parse(svg)` → `SVGLoader.createShapes` → `ExtrudeGeometry` có vát cạnh nhẹ. Thân chuông `depth` khoảng 18; `letter-p`/`letter-k` `depth` khoảng 30, đặt nhô ra trước.
  - Lật trục Y của SVG, căn giữa nhóm bằng bounding box.
  - Chất liệu: `MeshStandardMaterial({ color: 0xE9BE57, metalness: 0.95, roughness: 0.28 })`, môi trường `PMREMGenerator` + `RoomEnvironment`, renderer `alpha: true`, pixel ratio tối đa 1,5.
  - Chuyển động: lắc quanh trục Y ±12° theo sin thời gian; nghiêng theo pointer (lerp 0,06); khi cuộn hết Hero thì xoay thêm 30° và lùi camera thêm 25%.
  - `stop()` hủy rAF. `dispose()` giải phóng geometry, material, env map, renderer. Lắng nghe `webglcontextlost` để gọi `onContextLost`.

- [ ] **Step 7: Viết `HeroBell.tsx`.**
  - Ảnh tĩnh luôn hiện.
  - Khi `canUse3D(readMotionEnv())`: chờ `requestIdleCallback` (dự phòng `setTimeout` 1200ms), rồi `await import("@/components/three/bell-scene")` và `fetch("/brand/logo-mark.svg")`.
  - Dựng scene trên một `<canvas data-bell>` (thuộc tính `data-bell` dùng cho các bước test); canvas fade-in 0,6s rồi mới ẩn ảnh tĩnh.
  - `IntersectionObserver` + `visibilitychange` → `start`/`stop`. `pointermove` trên `window` → `setPointer`. Theo cuộn → `setScroll`.
  - Báo lên `HeroSection` (qua context hoặc callback) để truyền `paused` cho `AmbientShaderCanvas`.
  - Mọi lỗi (import, fetch, WebGL, context lost): `dispose`, giữ ảnh tĩnh, không `console.error`.
  - Unmount hoặc thiết bị không còn đủ điều kiện sau `resize`: `dispose` đúng 1 lần.
  - Truyền `<HeroBell />` vào prop `bell`.

- [ ] **Step 8: Kiểm tra trên trình duyệt (dev).**
  - 1440px: chuông 3D hiện sau mockup, xoay lắc, nghiêng theo chuột, xoay và lùi khi cuộn.
  - 375px: chỉ có ảnh tĩnh; tab Network **không** có request chunk three.

- [ ] **Step 9 (Review Focus 4): Lỗi tải 3D.** Trong DevTools chặn URL chunk chứa `three` (Network request blocking) rồi tải lại ở 1440px. Expected: ảnh chuông tĩnh vẫn hiện, console không có lỗi đỏ từ code trang. Sau đó bỏ chặn, chạy `document.querySelector("canvas[data-bell]").getContext("webgl2").getExtension("WEBGL_lose_context").loseContext()`. Expected: quay về ảnh tĩnh, không lỗi.

- [ ] **Step 10 (Review Focus 5, phần 3D):** ở 1440px đợi 3D hiện, kéo cửa sổ xuống 900px rồi lên lại 1440px. Expected: `document.querySelectorAll("canvas[data-bell]").length` ≤ 1 ở mọi thời điểm.

- [ ] **Step 11: Kiểm tra.** Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`. Expected: không lỗi; trong `.next/static/chunks`, chunk chứa `WebGLRenderer` khác các chunk tải lần đầu của trang `/`.

---

### Task 4: Hiệu ứng nhẹ cho các section

**Files:**
- Create: `src/components/motion/ScrollScale.tsx`, `src/components/motion/Parallax.tsx`
- Modify: `src/components/modules/PainPointsSection.tsx`, `src/components/modules/ApprovalPortalDemo.tsx`, `src/components/modules/ProcessStepperSection.tsx`, `src/components/ui/SectionHeader.tsx`, `src/components/modules/PricingFaqSection.tsx`

**Interfaces:**
- Consumes: `useHeavyMotion()` (Task 1), `TiltCard` (Task 2)
- Produces:
  - `Parallax({ children, distance, className }: { children: ReactNode; distance: number /* px, ±24 tối đa */; className?: string })`
  - `ScrollScale({ children, from = 0.9, rotateXFrom = 8, className })`: theo `useScroll` của chính phần tử, offset `["start end", "center center"]`

- [ ] **Step 1: Nỗi đau.** Bọc 3 thẻ bằng `Parallax` với `distance` lần lượt 0, 16, 24. Parallax chạy cả trên điện thoại (nhẹ), tắt khi giảm chuyển động.
- [ ] **Step 2: Cổng duyệt bài.** Bọc khung trình duyệt demo bằng `ScrollScale` (0,9 → 1, nghiêng 8° → 0, `perspective` 1200px trên phần tử cha). Trên màn < 1024px chỉ scale, không nghiêng.
- [ ] **Step 3: Quy trình.** Khung preview: thêm `initial={{ scale: 0.97 }}`, `animate={{ scale: 1 }}` vào `m.div` đang đổi theo bước.
- [ ] **Step 4: Tiêu đề section.** Gạch `h-px w-6` thành `m.span`, `scaleX` 0 → 1, `origin-left`, khi vào khung nhìn (một lần).
- [ ] **Step 5: Bảng giá.** Bọc thẻ có `plan.featured` bằng `TiltCard maxDeg={4}`.
- [ ] **Step 6: Kiểm tra trên trình duyệt** ở 1440px và 375px: từng hiệu ứng chạy; chữ vẫn đọc được trong lúc chuyển động; không tràn ngang; cổng duyệt và form vẫn bấm và gõ được.
- [ ] **Step 7: Kiểm tra.** Run: `npx tsc --noEmit && npm run lint && npm test`. Expected: không lỗi.

---

### Task 5: Cuộn ngang "4 chốt chặn"

**Files:**
- Modify: `src/components/modules/QualityGuardrailsSection.tsx` (tách phần client sang `src/components/modules/guardrails/GuardrailsTrack.tsx` nếu cần, vì section đang là server component)

**Interfaces:**
- Consumes: `useHeavyMotion()` (Task 1), `guardrailItems` (đã có)
- Produces: `GuardrailsTrack({ items }: { items: GuardrailItem[] })`

- [ ] **Step 1: Viết `GuardrailsTrack`.**
  - Khi `useHeavyMotion()` là `true`: section cao `items.length * 100vh`, bên trong khung `sticky top-0 h-screen`. Dải thẻ dịch `x` từ 0 tới `-(chiều rộng dải − chiều rộng khung nhìn)` theo `scrollYProgress` của section.
  - Bộ đếm `01 / 04` đổi theo thẻ đang ở giữa.
  - Thẻ rộng khoảng `min(560px, 42vw)`.
  - Khi `false` (điện thoại, giảm chuyển động, SSR): lưới hiện tại (`md:grid-cols-2`) giữ nguyên.
  - Đo chiều rộng bằng `ResizeObserver`.
- [ ] **Step 2: Kiểm tra trên trình duyệt (1440px).** Cuộn qua section: 4 thẻ trượt ngang lần lượt, bộ đếm đổi 01 → 04, cuộn tiếp thì thoát ra section Bảng giá trơn tru.
- [ ] **Step 3 (Review Focus 2): Link neo qua đoạn ghim.** Từ đầu trang bấm "Gói vận hành" trên Navbar. Expected: dừng ở tiêu đề Bảng giá (đỉnh `#goi-van-hanh` cách đỉnh màn hình 60 đến 90px). Làm lại với nút "Nhận tư vấn": dừng ở form.
- [ ] **Step 4 (Review Focus 5, phần bố cục):** ở 1440px cuộn vào giữa đoạn ghim, kéo cửa sổ xuống 800px rồi lên lại. Expected: chuyển sang lưới dọc và quay lại dạng ghim; `scrollWidth <= innerWidth` ở cả hai kích thước; không còn khoảng trống cao bất thường khi ở 800px.
- [ ] **Step 5: Kiểm tra.** Run: `npx tsc --noEmit && npm run lint && npm test`. Expected: không lỗi.

---

### Task 6: Nghiệm thu toàn bộ

**Files:** không tạo mới (chỉ sửa nếu phát hiện lỗi).

- [ ] **Step 1: Build production.** Dừng dev server trước. Run: `rm -rf .next && npx tsc --noEmit && npm run lint && npm test && npm run build`. Expected: không lỗi.
- [ ] **Step 2: Lighthouse** trên `npm run start -- -p 3001`: 3 lần mobile, 1 lần desktop (`npx -y lighthouse@12.8.2 ... --preset=desktop`). Expected:
  - mobile Performance ≥ 78 (trung vị 3 lần)
  - desktop ≥ 95
  - Accessibility, Best Practices, SEO = 100

  Nếu mobile < 78: đo lại với `SMOOTH_SCROLL_TOUCH = false` để biết phần nào gây tụt, rồi báo anh/chị (theo spec 5.1).
- [ ] **Step 3: Network ở 375px.** Expected: không có chunk chứa `WebGLRenderer`.
- [ ] **Step 4: Giảm chuyển động.** Giả lập `prefers-reduced-motion: reduce` (DevTools Rendering). Expected: không thanh tiến trình, không parallax, không cuộn ngang (lưới dọc), Hero có ảnh chuông tĩnh, link neo nhảy thẳng tới mục.
- [ ] **Step 5: Hồi quy chức năng:**
  - cổng duyệt: sai PIN, đúng PIN, Duyệt, Tua nhanh, Thử lại, Góp ý, Khóa
  - Showcase: đổi tab, đổi ngành
  - FAQ, nút chọn gói tự chọn đúng gói trong form
  - form: báo lỗi khi bỏ trống; gửi thành công qua webhook giả như lần QA trước
  - menu mobile: mở, bấm link, phím Esc
  - console không có lỗi
- [ ] **Step 6: Xem trực quan** ở 375 / 768 / 1440px: chụp Hero, đoạn cuộn ngang, cổng duyệt. Không tràn ngang, không chữ chồng chữ.
- [ ] **Step 7: Báo cáo cuộn mượt cảm ứng**: cảm giác thực tế ở khung 375px cảm ứng và điểm mobile có/không có `SMOOTH_SCROLL_TOUCH`, để anh/chị quyết định giữ hay tắt.
