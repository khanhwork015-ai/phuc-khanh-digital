"use client";

import { m, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useHeavyMotion } from "@/components/motion/useHeavyMotion";
import { cn } from "@/lib/utils";

type ScrollScaleProps = { children: ReactNode; from?: number; rotateXFrom?: number; className?: string };

/**
 * Phóng phần tử từ `from` lên 1 và dựng thẳng từ `rotateXFrom` độ về 0 khi cuộn tới giữa màn hình.
 * Nghiêng chỉ chạy trên màn ≥ 1024px; giảm chuyển động thì giữ nguyên trạng thái tĩnh.
 */
export function ScrollScale({ children, from = 0.9, rotateXFrom = 8, className }: ScrollScaleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion() === true;
  const heavy = useHeavyMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  const scale = useTransform(progress, [0, 1], still ? [1, 1] : [from, 1]);
  const rotateX = useTransform(progress, [0, 1], still || !heavy ? [0, 0] : [rotateXFrom, 0]);

  return (
    <div className={cn("[perspective:1200px]", className)}>
      <m.div ref={ref} style={{ scale, rotateX, transformOrigin: "50% 0%" }}>
        {children}
      </m.div>
    </div>
  );
}
