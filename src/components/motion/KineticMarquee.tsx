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
 * Dải chữ chuyển động ngang phản ứng theo tốc độ cuộn (scroll-velocity marquee).
 * Tự động chạy mượt 60fps trên cả desktop và mobile; dừng đứng khi bật Reduce Motion.
 */
export function KineticMarquee() {
  const still = useReducedMotion() === true;
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 300 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1200], [0, 4], { clamp: false });
  const direction = useRef(1);

  useAnimationFrame((_, delta) => {
    if (still) return;
    const v = velocityFactor.get();
    if (v < -0.1) direction.current = -1;
    else if (v > 0.1) direction.current = 1;

    let moveBy = direction.current * -1.4 * (delta / 16.67);
    moveBy += direction.current * Math.abs(v) * -0.9 * (delta / 16.67);

    let next = baseX.get() + moveBy;
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
      <m.div style={still ? undefined : { x }} className="flex w-max items-center gap-8 whitespace-nowrap">
        {[0, 1, 2, 3].map((dup) => (
          <div key={dup} className="flex items-center gap-8">
            {ITEMS.map((label) => (
              <span key={`${dup}-${label}`} className="flex items-center gap-8 font-mono text-[12px] tracking-[0.2em] text-fg-3">
                <span className="text-ivory/80">{label}</span>
                <span className="size-1.5 rotate-45 bg-accent/80" />
              </span>
            ))}
          </div>
        ))}
      </m.div>
    </div>
  );
}
