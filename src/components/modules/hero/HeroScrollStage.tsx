"use client";

import { ArrowDown } from "lucide-react";
import { m, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useHeavyMotion } from "@/components/motion/useHeavyMotion";

type HeroScrollStageProps = { text: ReactNode; bell: ReactNode };

/**
 * Sân khấu Hero 100vh:
 * - Cột trái: Tiêu đề + CTA.
 * - Cột phải: Quả chuông PK 3D + vòng quỹ đạo + hạt vàng đứng lộ thiên 100% (không bị thẻ nào che).
 * - Khi cuộn xuống: sân khấu zoom-out nhẹ (1 -> 0.88) và tách lớp parallax mượt.
 */
export function HeroScrollStage({ text, bell }: HeroScrollStageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion() === true;
  const heavy = useHeavyMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 24, mass: 0.45 });

  const textY = useTransform(progress, [0, 1], still ? [0, 0] : heavy ? [0, -110] : [0, -36]);
  const textOpacity = useTransform(progress, [0, 0.55, 1], still ? [1, 1, 1] : [1, 0.9, 0.1]);

  const bellY = useTransform(progress, [0, 1], still ? [0, 0] : heavy ? [0, -50] : [0, -24]);
  const bellScale = useTransform(progress, [0, 0.5, 1], still ? [1, 1, 1] : heavy ? [1, 1.12, 0.86] : [1, 1.05, 0.92]);

  const stageScale = useTransform(progress, [0, 0.7, 1], still ? [1, 1, 1] : heavy ? [1, 0.96, 0.88] : [1, 0.98, 0.94]);
  const cueOpacity = useTransform(progress, [0, 0.15], still ? [0, 0] : [1, 0]);

  return (
    <div ref={ref} className="relative flex min-h-[calc(100svh-4rem)] flex-col justify-center overflow-hidden py-16 pt-24 lg:min-h-screen lg:py-0 lg:pt-16">
      <m.div
        style={{ scale: stageScale }}
        className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 md:px-8 lg:grid-cols-[52fr_48fr] lg:gap-8"
      >
        <m.div style={{ y: textY, opacity: textOpacity }} className="relative z-10 max-w-2xl">
          {text}
        </m.div>

        <m.div
          aria-hidden
          style={{ y: bellY, scale: bellScale }}
          className="relative mx-auto aspect-[612/530] w-[82vw] max-w-[360px] sm:w-[400px] lg:w-full lg:max-w-[580px]"
        >
          {bell}
        </m.div>
      </m.div>

      <m.div
        aria-hidden
        style={{ opacity: cueOpacity }}
        className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex"
      >
        <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-fg-3">Cuộn để khám phá</span>
        <span className="flex size-7 items-center justify-center rounded-full border border-line bg-surface/60 text-accent backdrop-blur-sm">
          <ArrowDown size={13} className="animate-bounce" />
        </span>
      </m.div>
    </div>
  );
}
