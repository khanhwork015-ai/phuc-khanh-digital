"use client";

import { m, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Con trỏ từ tính kiểu studio (chỉ chạy trên desktop có chuột, tắt hoàn toàn trên mobile/touch & Reduce Motion).
 * Tự phóng to vòng ngoài khi rê qua link/button để tạo phản hồi tinh tế.
 */
export function MagneticCursor() {
  const still = useReducedMotion() === true;
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 260, damping: 28, mass: 0.4 });
  const ringY = useSpring(y, { stiffness: 260, damping: 28, mass: 0.4 });

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setEnabled(mq.matches && !still);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [still]);

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);

      const target = e.target as HTMLElement | null;
      const interactive = target?.closest("a, button, input, select, textarea, [role='button'], [role='tab']");
      setHovering(Boolean(interactive));
    };
    const onLeave = () => setVisible(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] hidden lg:block">
      <m.div
        style={{ x: ringX, y: ringY, translateX: "-50%", translateY: "-50%" }}
        animate={{
          scale: hovering ? 1.65 : 1,
          opacity: visible ? (hovering ? 0.9 : 0.45) : 0,
        }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="size-8 rounded-full border border-accent/70 bg-accent/[0.04] backdrop-blur-[1px]"
      />
      <m.div
        style={{ x, y, translateX: "-50%", translateY: "-50%" }}
        animate={{
          scale: hovering ? 0.5 : 1,
          opacity: visible ? 1 : 0,
        }}
        transition={{ duration: 0.12 }}
        className="size-1.5 rounded-full bg-accent"
      />
    </div>
  );
}
