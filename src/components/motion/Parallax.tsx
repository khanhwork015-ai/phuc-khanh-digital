"use client";

import { m, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useHeavyMotion } from "@/components/motion/useHeavyMotion";

type ParallaxProps = { children: ReactNode; distance: number; className?: string };

/**
 * Dịch dọc mượt theo cuộn (parallax):
 * - Desktop: biên độ tối đa ±96px để thấy rõ chiều sâu tách lớp.
 * - Mobile: giảm còn 40% để giữ mượt và không tràn khung.
 */
export function Parallax({ children, distance, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion() === true;
  const heavy = useHeavyMotion();
  const clamped = Math.max(-96, Math.min(96, distance));
  const d = heavy ? clamped : Math.round(clamped * 0.4);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 130, damping: 26, mass: 0.35 });
  const y = useTransform(smooth, [0, 1], still ? [0, 0] : [d, -d]);

  return (
    <m.div ref={ref} style={{ y }} className={className}>
      {children}
    </m.div>
  );
}
