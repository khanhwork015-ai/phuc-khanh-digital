"use client";

import { m, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type TiltCardProps = {
  children: ReactNode;
  maxDeg?: number;
  className?: string;
};

/**
 * Thẻ nghiêng 3D + vệt sáng specular theo con trỏ chuột (chỉ bật trên desktop có chuột).
 * Trên mobile/touch hoặc Reduce Motion, tự động giữ phẳng mượt mà.
 */
export function TiltCard({ children, maxDeg = 6, className }: TiltCardProps) {
  const still = useReducedMotion() === true;
  const [finePointer, setFinePointer] = useState(false);

  const rxTarget = useMotionValue(0);
  const ryTarget = useMotionValue(0);
  const mx = useMotionValue(50);
  const my = useMotionValue(50);

  const rotateX = useSpring(rxTarget, { stiffness: 220, damping: 24, mass: 0.5 });
  const rotateY = useSpring(ryTarget, { stiffness: 220, damping: 24, mass: 0.5 });
  const glow = useMotionTemplate`radial-gradient(420px circle at ${mx}% ${my}%, rgb(233 190 87 / 0.14), transparent 65%)`;

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFinePointer(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const enabled = finePointer && !still;

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    mx.set(px * 100);
    my.set(py * 100);
    rxTarget.set((0.5 - py) * 2 * maxDeg);
    ryTarget.set((px - 0.5) * 2 * maxDeg);
  };

  const onPointerLeave = () => {
    rxTarget.set(0);
    ryTarget.set(0);
  };

  return (
    <div className={cn("[perspective:1100px]", className)}>
      <m.div
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        style={enabled ? { rotateX, rotateY, transformStyle: "preserve-3d" } : undefined}
        className="group/tilt relative rounded-2xl will-change-transform"
      >
        {children}
        {enabled && (
          <m.div
            aria-hidden
            style={{ background: glow }}
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100"
          />
        )}
      </m.div>
    </div>
  );
}
