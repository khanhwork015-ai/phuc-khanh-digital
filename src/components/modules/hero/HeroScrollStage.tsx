"use client";

import { ArrowDown } from "lucide-react";
import { m, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useHeavyMotion } from "@/components/motion/useHeavyMotion";

type HeroScrollStageProps = { text: ReactNode; bell: ReactNode };

/**
 * Sân khấu Hero 3D:
 * - Desktop (>= 1024px): ghim 100vh trong vùng cuộn 185vh — chuông PK 3D đứng lộ thiên 100% ở cột phải,
 *   khi cuộn sẽ zoom-in (1 -> 1.18) rồi zoom-out (1.18 -> 0.8), chữ trôi parallax từ dưới lên và mờ dần.
 * - Mobile (< 1024px): chiều cao tự nhiên, vẫn có parallax + zoom nhẹ khi cuộn qua.
 */
export function HeroScrollStage({ text, bell }: HeroScrollStageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion() === true;
  const heavy = useHeavyMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 105, damping: 24, mass: 0.45 });

  const textY = useTransform(progress, [0, 1], still ? [0, 0] : heavy ? [0, -100] : [0, -32]);
  const textOpacity = useTransform(progress, [0, 0.65, 1], still ? [1, 1, 1] : [1, 0.95, 0.1]);

  const bellY = useTransform(progress, [0, 1], still ? [0, 0] : heavy ? [0, -40] : [0, -24]);
  const bellScale = useTransform(progress, [0, 0.45, 1], still ? [1, 1, 1] : heavy ? [1, 1.18, 0.8] : [1, 1.06, 0.9]);
  const bellOpacity = useTransform(progress, [0, 0.72, 1], still ? [1, 1, 1] : [1, 1, 0.2]);

  const stageScale = useTransform(progress, [0, 0.65, 1], still ? [1, 1, 1] : heavy ? [1, 0.98, 0.9] : [1, 0.98, 0.95]);
  const cueOpacity = useTransform(progress, [0, 0.14], still ? [0, 0] : [1, 0]);
  const backdropX = useTransform(progress, [0, 0.85], still ? ["0%", "0%"] : ["0%", "100%"]);
  const backdropOpacity = useTransform(progress, [0, 0.7, 0.95], still ? [1, 1, 1] : [1, 0.6, 0]);

  return (
    <div ref={ref} className="relative lg:h-[185vh]">
      <div className="relative flex min-h-[calc(100svh-4rem)] flex-col justify-center overflow-hidden py-16 pt-24 lg:sticky lg:top-0 lg:h-screen lg:py-0 lg:pt-16">
        <m.div
          aria-hidden
          style={{ x: backdropX, opacity: backdropOpacity }}
          className="pk-hero-light-backdrop pointer-events-none absolute inset-0 -z-10 hidden will-change-transform lg:block"
        />
        <m.div
          style={{ scale: stageScale }}
          className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 md:px-8 lg:grid-cols-[52fr_48fr] lg:gap-8"
        >
          <m.div style={{ y: textY, opacity: textOpacity }} className="relative z-10 max-w-2xl">
            {text}
          </m.div>

          <m.div
            aria-hidden
            style={{ y: bellY, scale: bellScale, opacity: bellOpacity }}
            className="relative mx-auto aspect-[656/538] w-[80vw] max-w-[340px] sm:w-[380px] lg:w-full lg:max-w-[500px]"
          >
            <div className="pk-hero-bell-mobile-backdrop pointer-events-none absolute -inset-x-[30vw] -inset-y-10 -z-10 lg:hidden" />
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
    </div>
  );
}
