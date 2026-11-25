"use client";

import {
  m,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { useRef } from "react";

const ITEMS = [
  "BRAND KIT ĐỘC BẢN",
  "VIẾT BÀI TỰ NHIÊN",
  "GẮN LOGO GỐC AN TOÀN",
  "DUYỆT BÀI 1 CHẠM",
  "ĐĂNG ĐÚNG GIỜ",
  "BÁO CÁO SỐ LIỆU THẬT",
];

/**
 * Dải chữ chạy vòng lặp vô tận (seamless marquee), tự tăng tốc nhẹ theo tốc độ cuộn.
 * Dùng 2 track giống hệt nhau (không gap ngoài, mỗi track tự chừa pr-8) để dịch -50% khớp từng pixel.
 */
export function KineticMarquee() {
  const still = useReducedMotion() === true;
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 300 });
  const velocityFactor = useTransform(smoothVelocity, [-1500, 0, 1500], [-0.14, 0, 0.14]);
  const direction = useRef(-1);

  useAnimationFrame((_, delta) => {
    if (still) return;
    const clampedDelta = Math.min(delta, 50);
    const v = velocityFactor.get();
    if (v < -0.005) direction.current = 1;
    else if (v > 0.005) direction.current = -1;

    const baseSpeed = 0.032; // ~1.9% mỗi giây -> trôi êm, dễ đọc
    const boost = Math.min(0.14, Math.abs(v));
    let next = baseX.get() + direction.current * (baseSpeed + boost) * (clampedDelta / 16.67);

    if (next <= -50) next += 50;
    if (next > 0) next -= 50;
    baseX.set(next);
  });

  const x = useTransform(baseX, (v) => `${v}%`);

  return (
    <div
      aria-hidden
      className="relative overflow-hidden border-b border-line bg-surface/40 py-4 select-none"
    >
      <m.div style={still ? undefined : { x }} className="flex w-max items-center whitespace-nowrap will-change-transform">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0 items-center gap-8 pr-8">
            {ITEMS.map((label) => (
              <span key={`${dup}-${label}`} className="flex items-center gap-8 font-mono text-[12px] tracking-[0.2em] text-fg-3">
                <span className="text-ivory/85">{label}</span>
                <span className="size-1.5 rotate-45 bg-accent/80" />
              </span>
            ))}
          </div>
        ))}
      </m.div>
    </div>
  );
}
