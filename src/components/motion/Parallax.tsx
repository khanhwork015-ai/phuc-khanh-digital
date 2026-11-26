"use client";

import { m, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useHeavyMotion } from "@/components/motion/useHeavyMotion";

type ParallaxProps = { children: ReactNode; distance: number; className?: string };

/**
 * Dịch dọc mượt theo cuộn (parallax):
 * - Desktop (>= 1024px): biên độ tối đa ±96px để thấy rõ chiều sâu tách lớp.
 * - Mobile/Tablet (< 1024px) hoặc Reduce Motion: bỏ qua listener cuộn để cuộn cảm ứng mượt 60fps+.
 */
export function Parallax({ children, distance, className }: ParallaxProps) {
  const still = useReducedMotion() === true;
  const heavy = useHeavyMotion();

  if (still || !heavy) {
    return <div className={className}>{children}</div>;
  }

  return (
    <ParallaxTrack distance={distance} className={className}>
      {children}
    </ParallaxTrack>
  );
}

function ParallaxTrack({ children, distance, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const clamped = Math.max(-96, Math.min(96, distance));
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 130, damping: 26, mass: 0.35 });
  const y = useTransform(smooth, [0, 1], [clamped, -clamped]);

  return (
    <m.div ref={ref} style={{ y }} className={className}>
      {children}
    </m.div>
  );
}
