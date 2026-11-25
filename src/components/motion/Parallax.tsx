"use client";

import { m, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useHeavyMotion } from "@/components/motion/useHeavyMotion";

type ParallaxProps = { children: ReactNode; distance: number; className?: string };

/**
 * Dịch dọc mượt theo cuộn (parallax):
 * - Desktop: biên độ tối đa ±72px.
 * - Mobile: giảm một nửa để tránh tràn khung mà vẫn có chiều sâu.
 */
export function Parallax({ children, distance, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion() === true;
  const heavy = useHeavyMotion();
  const clamped = Math.max(-72, Math.min(72, distance));
  const d = heavy ? clamped : Math.round(clamped * 0.45);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.35 });
  const y = useTransform(smooth, [0, 1], still ? [0, 0] : [d, -d]);

  return (
    <m.div ref={ref} style={{ y }} className={className}>
      {children}
    </m.div>
  );
}
