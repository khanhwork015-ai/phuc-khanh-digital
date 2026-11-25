"use client";

import { m, useScroll, useSpring } from "motion/react";

/**
 * Dải vàng 2px dưới Navbar, dài theo phần trăm trang đã cuộn.
 * Luôn render cùng một thẻ ở server và client (tránh lỗi hydration); giảm chuyển động thì ẩn bằng CSS.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });

  return (
    <m.div
      aria-hidden
      style={{ scaleX }}
      className="pointer-events-none absolute inset-x-0 -bottom-px h-[2px] origin-left bg-accent motion-reduce:hidden"
    />
  );
}
