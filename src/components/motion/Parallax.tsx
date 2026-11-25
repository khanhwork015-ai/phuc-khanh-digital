"use client";

import { m, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

type ParallaxProps = { children: ReactNode; distance: number; className?: string };

/** Dịch dọc theo cuộn: từ +distance (vừa vào màn hình) tới -distance (sắp ra). Tối đa ±24px theo spec. */
export function Parallax({ children, distance, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion() === true;
  const d = Math.max(-24, Math.min(24, distance));
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], still ? [0, 0] : [d, -d]);
  return (
    <m.div ref={ref} style={{ y }} className={className}>
      {children}
    </m.div>
  );
}
