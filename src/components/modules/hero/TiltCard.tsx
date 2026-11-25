"use client";

import { m, useSpring } from "motion/react";
import type { PointerEvent, ReactNode } from "react";
import { useHeavyMotion } from "@/components/motion/useHeavyMotion";
import { cn } from "@/lib/utils";

type TiltCardProps = { children: ReactNode; maxDeg?: number; className?: string };

/** Nghiêng phối cảnh theo vị trí chuột (tối đa maxDeg độ). Chỉ chạy khi useHeavyMotion() cho phép. */
export function TiltCard({ children, maxDeg = 6, className }: TiltCardProps) {
  const heavy = useHeavyMotion();
  const rotateX = useSpring(0, { stiffness: 150, damping: 18 });
  const rotateY = useSpring(0, { stiffness: 150, damping: 18 });

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!heavy || e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 2 * maxDeg);
    rotateX.set(-py * 2 * maxDeg);
  };
  const reset = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <div className={cn("[perspective:1000px]", className)} onPointerMove={onPointerMove} onPointerLeave={reset}>
      <m.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>{children}</m.div>
    </div>
  );
}
