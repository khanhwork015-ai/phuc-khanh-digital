"use client";

import { m, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useHeavyMotion } from "@/components/motion/useHeavyMotion";
import { cn } from "@/lib/utils";

type ScrollScaleProps = {
  children: ReactNode;
  from?: number;
  toExit?: number;
  rotateXFrom?: number;
  className?: string;
};

/**
 * Phóng zoom-in khi tiến vào tâm màn hình (from -> 1) và thu nhẹ zoom-out khi cuộn qua (1 -> toExit).
 * Desktop nghiêng phối cảnh 3D nhẹ; mobile giữ phẳng (rotateX = 0) để GPU cuộn mượt 60fps.
 */
export function ScrollScale({
  children,
  from = 0.88,
  toExit = 0.95,
  rotateXFrom = 7,
  className,
}: ScrollScaleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion() === true;
  const heavy = useHeavyMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });

  const startScale = heavy ? from : Math.max(from, 0.93);
  const endScale = heavy ? toExit : Math.max(toExit, 0.96);

  const scale = useTransform(progress, [0, 0.38, 0.72, 1], still ? [1, 1, 1, 1] : [startScale, 1, 1, endScale]);
  const opacity = useTransform(progress, [0, 0.22, 0.86, 1], still ? [1, 1, 1, 1] : [0.45, 1, 1, 0.75]);
  const rotateX = useTransform(progress, [0, 0.38], still || !heavy ? [0, 0] : [rotateXFrom, 0]);

  return (
    <div className={cn("[perspective:1200px]", className)}>
      <m.div ref={ref} style={{ scale, opacity, rotateX, transformOrigin: "50% 35%" }}>
        {children}
      </m.div>
    </div>
  );
}
